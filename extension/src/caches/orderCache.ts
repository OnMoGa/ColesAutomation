import { OrderDetails } from "../colesTypes";

let currentOrder: OrderDetails | undefined = undefined;

export const updateOrderDetailsCache = (order: OrderDetails) => {
  currentOrder = order;
};

export const getOrderDetailsCache = (): OrderDetails | undefined => {
  return currentOrder;
};
