import { Router } from "express";
import Groq from "groq-sdk";
import { getDB } from "../config/db";

const router = Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are the AI assistant for "Adhunik Boighor", an online bookshop.
You help customers:
- Find books by title, author, genre, or language
- Summarize books when asked
- Explain how to order (browse /books, open a book's details page, click "Add to cart", then checkout)
- Answer general questions about the shop

Be warm, concise, and helpful. If you don't have information about a specific book in the catalog provided below, say so honestly rather than making up details. Keep responses focused and not overly long.`;

// POST /api/chat — streaming chat response
router.post("/", async (req, res) => {
  try {
    const { messages } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages array is required" });
    }

    // Pull a lightweight catalog snapshot to ground the AI's answers
    const db = getDB();
    const catalog = await db
      .collection("items")
      .find({}, { projection: { title: 1, author: 1, genre: 1, price: 1, stock: 1, description: 1 } })
      .limit(50)
      .toArray();

    const catalogText = catalog
      .map(
        (b) =>
          `- "${b.title}" by ${b.author} (${b.genre}) — ৳${b.price}, ${
            b.stock > 0 ? "in stock" : "out of stock"
          }. ${b.description?.slice(0, 140) ?? ""}`
      )
      .join("\n");

    const systemMessage = `${SYSTEM_PROMPT}\n\nCurrent catalog:\n${catalogText}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemMessage }, ...messages],
      stream: true,
      temperature: 0.6,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to get AI response" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
      res.end();
    }
  }
});

export default router;