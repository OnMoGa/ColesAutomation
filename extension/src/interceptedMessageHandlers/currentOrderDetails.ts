import { CurrentOrderDetails } from "../colesTypes";
import { FetchInterceptedMessage } from "../injected/fetchHook";

export const isMessageForCurrentOrderDetails = (message: FetchInterceptedMessage) => {
  return message.url.match(/\/trolley\//) && message.method === "GET";
};

export const handleMessageForCurrentOrderDetails = (message: FetchInterceptedMessage) => {
  const order = message.responseJson as CurrentOrderDetails;
  // updateOrderDetailsCache(order);
};
