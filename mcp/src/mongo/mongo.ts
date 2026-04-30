import { Db, MongoClient } from "mongodb";

const MONGO_URI = process.env.MongoUri;
const MONGO_DATABASE = "coles_automation";

let mongoDb: Db | null = null;

export const getMongoDb = async (): Promise<Db> => {
  if (!MONGO_URI) {
    throw new Error("MongoUri is not set");
  }
  if (!mongoDb) {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    mongoDb = client.db(MONGO_DATABASE);
  }
  return mongoDb;
};
