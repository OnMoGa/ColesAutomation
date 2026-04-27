import { CurrentOrderDetails } from "../colesTypes";

let currentOrder: CurrentOrderDetails | undefined = undefined;

export const updateOrderDetailsCache = (order: CurrentOrderDetails) => {
  currentOrder = order;
};

export const getOrderDetailsCache = (): CurrentOrderDetails | undefined => {
  return currentOrder;
};
