import {
  ClientRequest,
  ClientResponse,
  CommandName,
  CommandResult,
  RequestParams,
} from "../../shared/protocol";
import { updateOrderDetailsCache } from "./caches/orderCache";
import { OrderDetails } from "./colesTypes";
import { addProductToCart } from "./commandHandlers/addProductToCart";
import { getCart } from "./commandHandlers/getCart";
import { getCategories } from "./commandHandlers/getCategories";
import { getSubcategories } from "./commandHandlers/getSubcategories";
import { getSubcategoryProducts } from "./commandHandlers/getSubcategoryProducts";
import { setCartQuantity } from "./commandHandlers/setCartQuantity";
import { FetchInterceptedMessage } from "./injected/fetchHook";
import { injectPageScript } from "./scriptInjector";

console.log("[ColesAutomation] Content script loaded");

injectPageScript("dist/injected/nextRouterBridge.js");
injectPageScript("dist/injected/fetchHook.js");
// injectPageScript("dist/injected/xhrHook.js");

type ContentResponse = Omit<ClientResponse, "id" | "type" | "command">;

chrome.runtime.onMessage.addListener(
  (message: ClientRequest, _sender, sendResponse) => {
    if (!message?.command) {
      sendResponse({
        ok: false,
        error: { code: "NO_COMMAND", message: "Missing command." },
      } satisfies ContentResponse);
      return;
    }

    void (async () => {
      try {
        const result = await runCommand(message.command, message.params);
        sendResponse({ ok: true, result } satisfies ContentResponse);
      } catch (error) {
        sendResponse({
          ok: false,
          error: {
            code: "COMMAND_FAILED",
            message: error instanceof Error ? error.message : "Unknown error.",
          },
        } satisfies ContentResponse);
      }
    })();

    return true;
  }
);

const runCommand = <TCommand extends CommandName>(
  command: TCommand,
  params: RequestParams[TCommand]
): Promise<CommandResult[TCommand]> => {
  return commandHandlers[command](params);
};

const commandHandlers: {
  [K in CommandName]: (params: RequestParams[K]) => Promise<CommandResult[K]>;
} = {
  list_categories: async () => ({
    categories: (await getCategories()).map((category) => category.name),
  }),
  list_subcategories: async (p) => ({
    subcategories: (await getSubcategories(p.categoryName)).map(
      (subcategory) => subcategory.name
    ),
  }),
  list_subcategory_products: async (p) => ({
    products: await getSubcategoryProducts(p.categoryName, p.subCategoryName),
  }),
  search_products: async (p) => {
    throw new Error("Not implemented.");
  },
  add_to_trolley: async (p) => await addProductToCart(p.productId),
  set_trolley_quantity: async (p) =>
    await setCartQuantity(p.productId, p.quantity),
  get_trolley: async () => {
    return { items: await getCart() };
  },
  remove_from_trolley: async (p) => {
    throw new Error("Not implemented.");
  },
  clear_trolley: async () => {
    throw new Error("Not implemented.");
  },
  review_order: async () => {
    throw new Error("Not implemented.");
  },
};

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as any;
  if (!data || data.__COLES_AUTOMATION__ !== true) return;
  if (data.kind === "FETCH_INTERCEPTED") {
    const fetchInterceptedMessage = data as FetchInterceptedMessage;
    if (fetchInterceptedMessage.url.match(/\/trolley\//)) {
      const order = fetchInterceptedMessage.responseJson as OrderDetails;
      updateOrderDetailsCache(order);
      return;
    }
  }
});
