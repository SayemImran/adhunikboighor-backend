import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import itemsRouter from "./routes/items";

dotenv.config();
const app = express();

const startServer = async () => {
  await connectDB();

  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
  app.use(express.json());

  app.use("/api/items", itemsRouter);

  app.get("/", (req, res) => res.send("Adhunik Boighor API running"));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Express server running on port ${PORT}`));
};

startServer();