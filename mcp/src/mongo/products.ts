import { ProductDetails } from "../../../shared/protocol.js";
import { getMongoDb } from "./mongo.js";

export const PRODUCTS_COLLECTION = "products" as const;

export interface Product {
  _id: string;
  name: string;
  brand: string;
  description: string;
  longDescription?: string;
  size: string;
  unitPrice?: number;
  productUrl?: string;
  categoryIds?: string[];
}

export const upsertProductInfo = async (productDetails: Product[]) => {
  const db = await getMongoDb();

  const updates = productDetails.map((product) => {
    const cleaned = Object.fromEntries(Object.entries(product).filter(([_, v]) => v != null && v != undefined));
    return {
      updateOne: {
        filter: { _id: product._id },
        update: { $set: cleaned },
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

export const getProductsByCategoryId = async (categoryId: string): Promise<Product[]> => {
  const db = await getMongoDb();
  return await db
    .collection<Product>(PRODUCTS_COLLECTION)
    .find({ categoryIds: { $in: [categoryId] } })
    .toArray();
};
