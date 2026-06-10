import { getMongoDb } from "./mongo.js";

export const CATEGORIES_COLLECTION = "categories" as const;

export interface Category {
  _id: string;
  name: string;
  url: string;
  subcategories?: Category[];
}

export const upsertCategories = async (categories: Category[]) => {
  const db = await getMongoDb();

  const updates = categories.map((category) => {
    return {
      updateOne: {
        filter: { _id: category._id },
        update: { $set: category },
        upsert: true,
      },
    };
  });
  await db.collection<Category>(CATEGORIES_COLLECTION).bulkWrite(updates);
};

export const getAllCategories = async () => {
  const db = await getMongoDb();
  return await db.collection<Category>(CATEGORIES_COLLECTION).find().toArray();
};

export const getCategoryById = async (categoryId: string): Promise<Category | undefined> => {
  const db = await getMongoDb();
  return (await db.collection<Category>(CATEGORIES_COLLECTION).findOne({ _id: categoryId })) ?? undefined;
};

export const getSubcategoriesByCategoryId = async (categoryId: string): Promise<Category[] | undefined> => {
  const db = await getMongoDb();
  return await db
    .collection<Category>(CATEGORIES_COLLECTION)
    .findOne({ _id: categoryId })
    .then((result) => result?.subcategories);
};

export const upsertSubcategoriesForCategory = async (categoryId: string, subcategories: Category[]) => {
  const db = await getMongoDb();
  await db.collection<Category>(CATEGORIES_COLLECTION).updateOne({ _id: categoryId }, { $set: { subcategories } });
};
