import { TrolleyItem } from "../../../shared/protocol";
import { getOrderDetailsCache } from "../caches/orderCache";
import { getProductById } from "../caches/productCache";

export const getCart = async (): Promise<TrolleyItem[]> => {
  const order = getOrderDetailsCache();
  if (!order) {
    throw new Error("Order not found.");
  }
  return order.items.map((item) => ({
    productId: item.productId.toString(),
    name: item.product.name,
    quantity: item.quantity,
    price: item.unitPrice,
    totalPrice: item.itemTotal,
    productUrl: getProductById(item.productId.toString())?.productUrl,
  }));
};
