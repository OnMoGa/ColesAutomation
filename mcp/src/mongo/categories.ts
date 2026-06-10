import { getMongoDb } from "./mongo.js";

export const CATEGORIES_COLLECTION = "categories" as const;

export interface Category {
  _id: string;
  name: string;
  url: string;
  subcategories?: Category[];
  productCount?: number;
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
  const topLevelCategory = await db.collection<Category>(CATEGORIES_COLLECTION).findOne({
    $or: [{ _id: categoryId }, { "subcategories._id": categoryId }, { "subcategories.subcategories._id": categoryId }],
  });

  if (!topLevelCategory) {
    return undefined;
  }
  if (topLevelCategory._id === categoryId) {
    return topLevelCategory;
  }
  const subCategory = topLevelCategory.subcategories?.find(
    (s) => s._id === categoryId || s.subcategories?.find((a) => a._id === categoryId),
  );
  if (!subCategory) {
    throw new Error("Impossible. Query must be wrong");
  }
  if (subCategory._id === categoryId) {
    return subCategory;
  }
  const aisle = subCategory.subcategories?.find((a) => a._id === categoryId);
  if (aisle) {
    return aisle;
  }
  return undefined;
};

export const getSubcategoriesByCategoryId = async (categoryId: string): Promise<Category[] | undefined> => {
  return (await getCategoryById(categoryId))?.subcategories;
};

export const upsertSubcategoriesForCategory = async (categoryId: string, subcategories: Category[]) => {
  const db = await getMongoDb();
  await db.collection<Category>(CATEGORIES_COLLECTION).updateOne({ _id: categoryId }, { $set: { subcategories } });
};
