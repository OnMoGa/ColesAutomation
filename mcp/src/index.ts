import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { randomUUID } from "crypto";
import type { IncomingMessage } from "http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { z } from "zod";
import {
  ClientRequest,
  ClientResponse,
  CommandName,
  CommandResult,
  RequestParams,
  TransportPingMessage,
} from "../../shared/protocol.js";
import { getAllPreviousOrdersDetails, upsertOrderItems, upsertPreviousOrderSummaries } from "./mongo/previousOrders.js";
import { getProductInfo, getProductsByCategoryId, Product, upsertProductInfo } from "./mongo/products.js";
import { getAllCategories, getCategoryById, upsertCategories } from "./mongo/categories.js";

const WS_PORT = Number(process.env.COLES_WS_PORT ?? 7357);
const WS_TOKEN = process.env.COLES_WS_TOKEN ?? "coles-dev-token";
const REQUEST_TIMEOUT_MS = Number(process.env.COLES_WS_TIMEOUT_MS ?? 15000);

const server = new McpServer({
  name: "coles",
  version: "1.0.0",
});

type PendingRequest = {
  resolve: (value: CommandResult[CommandName]) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const pending = new Map<string, PendingRequest>();
let clientSocket: WebSocket | null = null;

const wss = new WebSocketServer({ port: WS_PORT });
wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
  const url = new URL(request.url ?? "/", `http://localhost:${WS_PORT}`);
  const token = url.searchParams.get("token");
  if (token !== WS_TOKEN) {
    socket.close(1008, "Invalid token");
    return;
  }

  if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
    clientSocket.close(1012, "Replaced by new client");
  }
  clientSocket = socket;

  socket.on("message", (data: RawData) => {
    try {
      const parsed = JSON.parse(data.toString()) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed as TransportPingMessage).type === "ping" &&
        typeof (parsed as TransportPingMessage).id === "string"
      ) {
        socket.send(
          JSON.stringify({
            type: "pong",
            id: (parsed as TransportPingMessage).id,
          }),
        );
        return;
      }
      const message = parsed as ClientResponse;
      if (message.type !== "response" || !message.id) {
        return;
      }
      const entry = pending.get(message.id);
      if (!entry) {
        return;
      }
      clearTimeout(entry.timeout);
      pending.delete(message.id);
      if (message.ok) {
        entry.resolve(message.result as CommandResult[CommandName]);
      } else {
        entry.reject(
          new Error(`Error received from extension: ${message.error?.message ?? "Unknown extension error."}`),
        );
      }
    } catch {
      // Ignore malformed messages.
    }
  });

  socket.on("close", () => {
    if (clientSocket === socket) {
      clientSocket = null;
    }
  });
});

const sendCommand = <K extends CommandName>(command: K, params: RequestParams[K]): Promise<CommandResult[K]> => {
  if (!clientSocket || clientSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Error in sendCommand: Extension is not connected.");
  }
  const id = randomUUID();
  const request: ClientRequest<K> = {
    id,
    type: "request",
    command,
    params,
  };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Error in sendCommand: Extension request timed out."));
    }, REQUEST_TIMEOUT_MS);

    pending.set(id, {
      resolve: resolve as PendingRequest["resolve"],
      reject,
      timeout,
    });
    clientSocket?.send(JSON.stringify(request));
  });
};

const toTextContent = (value: unknown) => {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
};

server.registerTool(
  "coles_list_categories",
  {
    description: "List top-level product categories.",
    inputSchema: z.object({}),
  },
  async () => {
    let categories = await getAllCategories();
    if (categories.length === 0) {
      const colesResponse = await sendCommand("list_categories", {});
      categories = colesResponse.categories.map((category) => ({
        _id: category.id,
        name: category.name,
        url: category.url,
        productCount: category.productCount,
        subcategories: category.subcategories?.map((subcategory) => ({
          _id: subcategory.id,
          name: subcategory.name,
          url: subcategory.url,
          productCount: subcategory.productCount,
          subcategories: subcategory.subcategories?.map((aisle) => ({
            _id: aisle.id,
            name: aisle.name,
            url: aisle.url,
            productCount: aisle.productCount,
          })),
        })),
      }));
      await upsertCategories(categories);
    }
    return toTextContent(
      categories.map((category) => ({
        name: category.name,
        subcategories: category.subcategories?.map((subcategory) => ({
          name: subcategory.name,
          subcategories: subcategory.subcategories?.map((aisle) => ({
            id: aisle._id,
            name: aisle.name,
          })),
        })),
      })),
    );
  },
);

// server.registerTool(
//   "coles_list_subcategories",
//   {
//     description: "List subcategories under a top-level category.",
//     inputSchema: z.object({
//       categoryId: z.string().min(1).describe("The ID of the category to list subcategories for."),
//     }),
//   },
//   async ({ categoryId }) => {
//     const category = await getCategoryById(categoryId);
//     if (!category) {
//       throw new Error(`Category not found: ${categoryId}`);
//     }
//     let subcategories = category.subcategories;
//     // if (!subcategories || subcategories.length === 0) {
//     //   const colesResponse = await sendCommand("list_subcategories", { categoryUrl: category.url });
//     //   subcategories = colesResponse.subcategories.map((s) => ({
//     //     _id: s.url.substring(s.url.lastIndexOf("/") + 1),
//     //     name: s.name,
//     //     url: s.url,
//     //   }));
//     //   await upsertSubcategoriesForCategory(categoryId, subcategories);
//     // }
//     return toTextContent(subcategories);
//   },
// );

server.registerTool(
  "coles_list_category_products",
  {
    description:
      "List products for a specific category. This will provide the products' names, brands, descriptions, and importantly their id.",
    inputSchema: z.object({
      categoryId: z.string().min(1).describe("The numerical ID of the category to list products for."),
      // limit: z.number().int().positive().optional(),
      // offset: z.number().int().min(0).optional(),
    }),
  },
  async ({ categoryId }) => {
    const category = await getCategoryById(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    var products = await getProductsByCategoryId(categoryId);
    var page = 1;
    var totalProducts = category.productCount ?? 0;

    while (products.length < totalProducts * 0.9) {
      const colesResponse = await sendCommand("list_category_products", {
        categoryUrl: category.url,
        page: page,
      });

      totalProducts = colesResponse.noOfResults;

      const fetchedProducts = colesResponse.products.map((p) => ({
        _id: p.id,
        name: p.name,
        size: p.size,
        brand: p.brand,
        description: p.description,
        unitPrice: p.price,
        categoryIds: p.categoryIds,
        productUrl: p.productUrl,
      }));

      await upsertProductInfo(fetchedProducts);

      const newProducts = fetchedProducts.filter((p) => !products.some((p2) => p2._id === p._id));
      products = [...products, ...newProducts];

      const totalPages = Math.ceil(colesResponse.noOfResults / colesResponse.pageSize);
      if (page >= totalPages) {
        break;
      }
      page += 1;
    }

    return toTextContent(
      products.map((product) => ({
        id: product._id,
        name: product.name,
        size: product.size,
        brand: product.brand,
        description: product.description,
        unitPrice: product.unitPrice,
      })),
    );
  },
);

// server.registerTool(
//   "coles_search_products",
//   {
//     description: "Search for products by query string.",
//     inputSchema: z.object({
//       query: z.string().min(1),
//       limit: z.number().int().positive().optional(),
//       offset: z.number().int().min(0).optional(),
//     }),
//   },
//   async ({ query, limit, offset }) => toTextContent(await sendCommand("search_products", { query, limit, offset })),
// );

server.registerTool(
  "coles_add_to_cart",
  {
    description: "Add a product to the shopping cart by productId.",
    inputSchema: z.object({
      productId: z.string().min(1),
    }),
  },
  async ({ productId }) => {
    const colesResponse = await sendCommand("add_to_cart", { productId });
    return toTextContent({
      newQuantity: colesResponse.quantity,
    });
  },
);

server.registerTool(
  "coles_set_cart_quantity",
  {
    description: "Set the quantity of a product in the shopping cart by its productId.",
    inputSchema: z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(0),
    }),
  },
  async ({ productId, quantity }) => {
    const colesResponse = await sendCommand("set_cart_quantity", { productId, quantity });
    return toTextContent({
      newQuantity: colesResponse.quantity,
    });
  },
);

server.registerTool(
  "coles_get_cart_contents",
  {
    description: "Get the current shopping cart's contents.",
    inputSchema: z.object({}),
  },
  async () => {
    const colesResponse = await sendCommand("get_cart", {});
    return toTextContent({
      items: colesResponse.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
      })),
    });
  },
);

server.registerTool(
  "coles_remove_from_cart",
  {
    description: "Remove a product from the shopping cart.",
    inputSchema: z.object({
      productId: z.string().min(1),
    }),
  },
  async ({ productId }) => {
    const colesResponse = await sendCommand("remove_from_cart", { productId });
    return toTextContent({
      success: colesResponse.success,
    });
  },
);

// server.registerTool(
//   "coles_clear_cart",
//   {
//     description: "Remove all items from the shopping cart.",
//     inputSchema: z.object({}),
//   },
//   async () => {
//     const colesResponse = await sendCommand("clear_trolley", {});
//     return toTextContent({
//       cleared: colesResponse.cleared,
//     });
//   },
// );

server.registerTool(
  "coles_get_previous_orders",
  {
    description: "Return a list of previous orders, including details of the items in the orders.",
    inputSchema: z.object({}),
  },
  async () => {
    const previousOrders = await sendCommand("get_previous_orders", {});
    const docs = previousOrders.orders.map((order) => ({
      _id: order.orderId,
      orderStatus: order.orderStatus,
      orderPlacementTime: order.orderPlacementTime,
      orderAttributes: {
        orderTotalPrice: order.orderAttributes.orderTotalPrice,
      },
    }));
    await upsertPreviousOrderSummaries(docs);

    var previousOrderDetails = await getAllPreviousOrdersDetails();
    var ordersMissingItemDetails = previousOrderDetails.filter((d) => !d.items || d.items.length == 0);
    // for (const orderDetails of previousOrderDetails) {
    for (const orderDetails of ordersMissingItemDetails) {
      var newOrderDetails = await sendCommand("get_order_details", { orderId: orderDetails._id });
      var updatedOrderDetails = await upsertOrderItems(orderDetails._id, newOrderDetails.orderDetails.items);
      await upsertProductInfo(
        newOrderDetails.productInfo.map((p) => {
          var id = p.productId;
          delete (p as any).productId;
          return {
            _id: id,
            ...p,
          };
        }),
      );
      if (updatedOrderDetails) {
        orderDetails.items = updatedOrderDetails.items;
      }
    }

    var productIds = previousOrderDetails.flatMap((order) => order.items?.map((item) => item.productId) ?? []);

    var productInfoMap = new Map<string, Product>(
      (await getProductInfo(productIds)).map((product) => [product._id, product]),
    );
    var ordersWithResolvedItems = previousOrderDetails.map((order) => {
      return {
        id: order._id,
        totalPrice: order.orderAttributes.orderTotalPrice,
        orderPlacementTime: order.orderPlacementTime,
        items: order.items?.map((item) => {
          var product = productInfoMap.get(item.productId);
          return {
            name: product?.name,
            brand: product?.brand,
            description: product?.description,
            size: product?.size,
            unitPrice: product?.unitPrice,
            quantity: item.quantity,
          };
        }),
      };
    });

    return toTextContent(ordersWithResolvedItems);
  },
);

//Add a shopping list tool that the llm can refer to

const transport = new StdioServerTransport();
await server.connect(transport);
