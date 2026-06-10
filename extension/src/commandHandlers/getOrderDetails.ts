import { COLES_ORIGIN, navigateTo } from "../colesDom";
import { FetchInterceptedMessage } from "../injected/fetchHook";
import { logInfo } from "../logging";
import { getNextData, NextData, NextRequestData } from "../nextData";
import { waitForFetchMessage } from "../waitForFetchMessage";

export const getOrderDetails = async (orderId: string) => {
  var waitForMessageTask = waitForFetchMessage(isMessageForOrderDetailsNextData(orderId));
  await navigateTo(`${COLES_ORIGIN}/account/orders/${orderId}`);
  var nextData = (await waitForMessageTask) as NextRequestData<OrderDetailsPageProps>;

  // var nextData = getNextData<OrderDetailsPageProps>();
  var orderItems = Object.values(nextData.pageProps.initialState.bffApi.queries)
    .filter((q) => q.endpointName === "getOrderItems")
    .map((q) => q as OrderItemsQueryResult)
    .map((q) => q.data.items)
    .flat();
  return {
    items: orderItems,
  };
};

const isMessageForOrderDetailsNextData = (orderId: string): ((message: FetchInterceptedMessage) => boolean) => {
  return (message: FetchInterceptedMessage) =>
    message.url.match(`/account/orders/${orderId}.json`) !== null && message.method === "GET";
};

const isMessageForOrderDetails = (orderId: string): ((message: FetchInterceptedMessage) => boolean) => {
  return (message: FetchInterceptedMessage) =>
    message.url.match(`/api/bff/orders/${orderId}/items`) !== null && message.method === "GET";
};

interface OrderDetailsPageProps {
  initialState: {
    bffApi: {
      queries: Record<string, any>;
    };
  };
}

interface OrderItemsQueryResult {
  data: {
    items: OrderItem[];
  };
}

interface OrderItem {
  id: number;
  name: string;
  brand: string;
  description: string;
  size: string;
  orderItem: {
    quantity: number;
    unitPrice: number;
  };
}
