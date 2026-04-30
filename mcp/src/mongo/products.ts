import { ProductDetails } from "../../../shared/protocol.js";
import { getMongoDb } from "./mongo.js";

export const PRODUCTS_COLLECTION = "products" as const;

export interface Product {
  _id: string;
  name: string;
  brand: string;
  description: string;
  size: string;
  unitPrice: number;
}

export const upsertProductInfo = async (productDetails: Product[]) => {
  const db = await getMongoDb();

  const updates = productDetails.map((product) => {
    return {
      updateOne: {
        filter: { _id: product._id },
        update: { $set: product },
        upsert: true,
      },
    };
  });
  await db.collection<Product>(PRODUCTS_COLLECTION).bulkWrite(updates);
};

export const getProductInfo = async (productIds: string[]) => {
  const db = await getMongoDb();
  return await db
    .collection<Product>(PRODUCTS_COLLECTION)
    .find({ _id: { $in: productIds } })
    .toArray();
};
