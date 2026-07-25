import { MongoClient, ServerApiVersion, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db: Db;

export async function connectDB(): Promise<Db> {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("✅ MongoDB connected");
  db = client.db("adhunikboighor_db");
  return db;
}

export function getDB(): Db {
  if (!db) throw new Error("DB not initialized");
  return db;
}