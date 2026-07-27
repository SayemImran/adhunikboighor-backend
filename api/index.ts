import express from "express";
import cors from "cors";
import { connectDB } from "../src/config/db";
import itemsRouter from "../src/routes/items";
import chatRouter from "../src/routes/chat";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

let isConnected = false;

app.use(async (req, res, next) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  next();
});

app.use("/api/items", itemsRouter);
app.use("/api/chat", chatRouter);

app.get("/", (req, res) => res.send("Adhunik Boighor API running"));

export default app;