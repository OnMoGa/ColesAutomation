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
} from "../../shared/protocol.js";

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
      const message = JSON.parse(data.toString()) as ClientResponse;
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
          new Error(
            `Error received from extension: ${
              message.error?.message ?? "Unknown extension error."
            }`
          )
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

const sendCommand = <K extends CommandName>(
  command: K,
  params: RequestParams[K]
): Promise<CommandResult[K]> => {
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
  async () => toTextContent(await sendCommand("list_categories", {}))
);

server.registerTool(
  "coles_list_subcategories",
  {
    description: "List subcategories under a top-level category.",
    inputSchema: z.object({
      categoryName: z.string().min(1),
    }),
  },
  async ({ categoryName }) =>
    toTextContent(await sendCommand("list_subcategories", { categoryName }))
);

server.registerTool(
  "coles_list_subcategory_products",
  {
    description: "List products for a specific subcategory.",
    inputSchema: z.object({
      categoryName: z.string().min(1),
      subCategoryName: z.string().min(1),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
    }),
  },
  async ({ categoryName, subCategoryName, limit, offset }) =>
    toTextContent(
      await sendCommand("list_subcategory_products", {
        categoryName,
        subCategoryName,
        limit,
        offset,
      })
    )
);

server.registerTool(
  "coles_search_products",
  {
    description: "Search for products by query string.",
    inputSchema: z.object({
      query: z.string().min(1),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
    }),
  },
  async ({ query, limit, offset }) =>
    toTextContent(
      await sendCommand("search_products", { query, limit, offset })
    )
);

server.registerTool(
  "coles_add_to_trolley",
  {
    description: "Add a product to the trolley by productId.",
    inputSchema: z.object({
      productId: z.string().min(1),
    }),
  },
  async ({ productId }) =>
    toTextContent(await sendCommand("add_to_trolley", { productId }))
);

server.registerTool(
  "coles_set_trolley_quantity",
  {
    description:
      "Set the quantity of a product in the trolley by its productId.",
    inputSchema: z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(0),
    }),
  },
  async ({ productId, quantity }) =>
    toTextContent(
      await sendCommand("set_trolley_quantity", { productId, quantity })
    )
);

server.registerTool(
  "coles_get_trolley",
  {
    description: "Get the current trolley contents.",
    inputSchema: z.object({}),
  },
  async () => toTextContent(await sendCommand("get_trolley", {}))
);

server.registerTool(
  "coles_remove_from_trolley",
  {
    description: "Remove a product from the trolley.",
    inputSchema: z.object({
      productId: z.string().min(1),
    }),
  },
  async ({ productId }) =>
    toTextContent(await sendCommand("remove_from_trolley", { productId }))
);

server.registerTool(
  "coles_clear_trolley",
  {
    description: "Remove all items from the trolley.",
    inputSchema: z.object({}),
  },
  async () => toTextContent(await sendCommand("clear_trolley", {}))
);

server.registerTool(
  "coles_review_order",
  {
    description: "Return a summary of the trolley without placing an order.",
    inputSchema: z.object({}),
  },
  async () => toTextContent(await sendCommand("review_order", {}))
);

const transport = new StdioServerTransport();
await server.connect(transport);
