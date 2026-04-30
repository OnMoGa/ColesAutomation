import { getMongoDb } from "./mongo.js";

interface PreviousOrder {
  _id: string;
  orderStatus: string;
  orderPlacementTime: string;
  orderAttributes: {
    orderTotalPrice: number;
  };
  items?: OrderItem[];
}

interface OrderItem {
  productId: string;
  quantity: number;
}

export type PreviousOrderSummary = Pick<
  PreviousOrder,
  "_id" | "orderStatus" | "orderPlacementTime" | "orderAttributes"
>;

export const PREVIOUS_ORDERS_COLLECTION = "previous_orders" as const;

export const upsertPreviousOrderSummaries = async (orders: PreviousOrderSummary[]) => {
  const db = await getMongoDb();
  //make sure extra shit doesnt get saved to db
  var updates = orders.map((order) => {
    return {
      updateOne: {
        filter: { _id: order._id },
        update: { $set: order },
        upsert: true,
      },
    };
  });
  await db.collection<PreviousOrder>(PREVIOUS_ORDERS_COLLECTION).bulkWrite(updates);
};

export type PreviousOrderDetails = Pick<PreviousOrder, "_id" | "items" | "orderAttributes" | "orderPlacementTime">;

export const getAllPreviousOrdersDetails = async () => {
  const db = await getMongoDb();
  return await db
    .collection<PreviousOrder>(PREVIOUS_ORDERS_COLLECTION)
    .find()
    .project<PreviousOrderDetails>({ _id: 1, items: 1, orderAttributes: 1, orderPlacementTime: 1 })
    .toArray();
};

export const upsertOrderItems = async (orderId: string, items: OrderItem[]) => {
  const db = await getMongoDb();
  return await db
    .collection<PreviousOrder>(PREVIOUS_ORDERS_COLLECTION)
    .findOneAndUpdate({ _id: orderId }, { $set: { items } }, { returnDocument: "after" });
};
