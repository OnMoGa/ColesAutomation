import { COLES_ORIGIN, navigateTo } from "../colesDom";
import { FetchInterceptedMessage } from "../injected/fetchHook";

export const getPreviousOrders = async () => {
  if (window.location.href.startsWith(`${COLES_ORIGIN}/account/orders?status=past`)) {
    await navigateTo(`${COLES_ORIGIN}/account/orders?status=active`);
  }
  var waitForMessageTask = waitForFetchMessage(isMessageForPreviousOrders);
  await navigateTo(`${COLES_ORIGIN}/account/orders?status=past`);

  const previousOrdersResponse = (await waitForMessageTask) as PreviousOrdersResponse;
  const orders = previousOrdersResponse.orders;
  return orders;
};

const isMessageForPreviousOrders = (message: FetchInterceptedMessage): boolean => {
  return message.url.match(/\/api\/bff\/orders\?status=past/) !== null && message.method === "GET";
};

interface PreviousOrdersResponse {
  noOfOrders: number;
  totalNoOfOrders: number;
  lastDeliveredOrderDate: string;
  orders: PreviousOrder[];
}

interface PreviousOrder {
  orderId: string;
  orderStatus: string;
  orderPlacementTime: string;
  orderAttributes: {
    orderTotalPrice: number;
  };
}

const waitForFetchMessage = async (testFunction: (message: FetchInterceptedMessage) => boolean) => {
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as any;
      if (!data || data.__COLES_AUTOMATION__ !== true) return;
      if (data.kind === "FETCH_INTERCEPTED") {
        const fetchInterceptedMessage = data as FetchInterceptedMessage;
        if (testFunction(fetchInterceptedMessage)) {
          resolve(fetchInterceptedMessage.responseJson);
          window.removeEventListener("message", handler);
        }
      }
    };
    window.addEventListener("message", handler);
  });
};
