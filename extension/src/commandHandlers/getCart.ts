import { TrolleyItem } from "../../../shared/protocol";
import { CurrentOrderDetails, CurrentOrderItem } from "../colesTypes";
import { FetchInterceptedMessage } from "../injected/fetchHook";
import { waitForFetchMessage } from "../waitForFetchMessage";

export const getCart = async (): Promise<TrolleyItem[]> => {
  var waitForMessageTask = waitForFetchMessage(isMessageForCartDrawer());
  window.dispatchEvent(new Event("focus"));
  var nextData = (await waitForMessageTask) as CurrentOrderDetails;

  return nextData.items.map((item) => ({
    productId: item.productId.toString(),
    name: item.product.name,
    quantity: item.quantity,
    price: item.unitPrice,
    totalPrice: item.itemTotal,
  }));
};

const isMessageForCartDrawer = (): ((message: FetchInterceptedMessage) => boolean) => {
  return (message: FetchInterceptedMessage) =>
    message.url.match(`/api/bff/trolley/store/`) !== null && message.method === "GET";
};
