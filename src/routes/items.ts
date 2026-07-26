import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/requireAuth";

const router = Router();

// GET /api/items — public, list books with search, filter, sort, pagination
router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const {
      search,
      genre,
      language,
      featured,
      sort = "newest",
      page = "1",
      limit = "8",
    } = req.query as Record<string, string>;

    const query: Record<string, unknown> = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ title: regex }, { author: regex }];
    }

    if (genre && genre !== "All genres") {
      query.genre = genre;
    }

    if (language && language !== "All languages") {
      query.language = language;
    }

    if (featured === "true") {
      query.isFeatured = true;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating_desc: { rating: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.newest;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 8);
    const skip = (pageNum - 1) * limitNum;

    const collection = db.collection("items");

    const [items, total] = await Promise.all([
      collection.find(query).sort(sortQuery).skip(skip).limit(limitNum).toArray(),
      collection.countDocuments(query),
    ]);

    res.status(200).json({
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch items" });
  }
});

// GET /api/items/:id — public, single book
router.get("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const db = getDB();
    const item = await db.collection("items").findOne({ _id: new ObjectId(req.params.id) });

    if (!item) return res.status(404).json({ message: "Book not found" });
    res.status(200).json({ item });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch book" });
  }
});

// POST /api/items — protected, admin only
router.post("/", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const {
      title, author, genre, language, price, stock, rating,
      publisher, publishedYear, coverImage, description, isFeatured,
    } = req.body;

    if (!title || !author || !genre || !language || !publisher || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = getDB();
    const result = await db.collection("items").insertOne({
      title, author, genre, language,
      price: Number(price),
      stock: Number(stock),
      rating: Number(rating),
      publisher,
      publishedYear: Number(publishedYear),
      coverImage,
      description,
      isFeatured: Boolean(isFeatured),
      createdBy: req.user!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ message: "Book added successfully", id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: "Failed to add book" });
  }
});

// PATCH /api/items/:id — protected, admin only, update a book
router.patch("/:id", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const {
      title, author, genre, language, price, stock, rating,
      publisher, publishedYear, coverImage, description, isFeatured,
    } = req.body;

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };

    if (title !== undefined) updateFields.title = title;
    if (author !== undefined) updateFields.author = author;
    if (genre !== undefined) updateFields.genre = genre;
    if (language !== undefined) updateFields.language = language;
    if (price !== undefined) updateFields.price = Number(price);
    if (stock !== undefined) updateFields.stock = Number(stock);
    if (rating !== undefined) updateFields.rating = Number(rating);
    if (publisher !== undefined) updateFields.publisher = publisher;
    if (publishedYear !== undefined) updateFields.publishedYear = Number(publishedYear);
    if (coverImage !== undefined) updateFields.coverImage = coverImage;
    if (description !== undefined) updateFields.description = description;
    if (isFeatured !== undefined) updateFields.isFeatured = Boolean(isFeatured);

    const db = getDB();
    const result = await db
      .collection("items")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: updateFields },
        { returnDocument: "after" }
      );

    if (!result) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.status(200).json({ message: "Book updated successfully", item: result });
  } catch (err) {
    res.status(500).json({ message: "Failed to update book" });
  }
});

// DELETE /api/items/:id — protected, admin only
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const db = getDB();
    const result = await db.collection("items").deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.status(200).json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete book" });
  }
});

export default router;