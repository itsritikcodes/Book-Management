const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public")); // serves the Book Manager UI at /

// ---------------------------------------------------------------------------
// In-memory data store (resets when the server restarts)
// ---------------------------------------------------------------------------
let books = [
  { id: 1, title: "The Hobbit", author: "J.R.R. Tolkien", year: 1937, genre: "Fantasy" },
  { id: 2, title: "1984", author: "George Orwell", year: 1949, genre: "Dystopian" },
  { id: 3, title: "Pride and Prejudice", author: "Jane Austen", year: 1813, genre: "Romance" },
];
let nextId = 4;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------
function validateBook(body, { partial = false } = {}) {
  const errors = [];
  const { title, author, year, genre } = body;

  if (!partial || title !== undefined) {
    if (typeof title !== "string" || !title.trim()) errors.push("title must be a non-empty string");
  }
  if (!partial || author !== undefined) {
    if (typeof author !== "string" || !author.trim()) errors.push("author must be a non-empty string");
  }
  if (year !== undefined && (!Number.isInteger(year) || year > new Date().getFullYear())) {
    errors.push("year must be an integer that is not in the future");
  }
  if (genre !== undefined && typeof genre !== "string") {
    errors.push("genre must be a string");
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /books  -> list all (optional filters: ?author=...&genre=...&q=...)
app.get("/books", (req, res) => {
  const { author, genre, q } = req.query;
  let result = books;

  if (author) result = result.filter((b) => b.author.toLowerCase().includes(author.toLowerCase()));
  if (genre) result = result.filter((b) => (b.genre || "").toLowerCase() === genre.toLowerCase());
  if (q) result = result.filter((b) => b.title.toLowerCase().includes(q.toLowerCase()));

  res.json(result);
});

// GET /books/:id  -> get one
app.get("/books/:id", (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: "Book not found" });
  res.json(book);
});

// POST /books  -> create
app.post("/books", (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { title, author, year, genre } = req.body;
  const book = { id: nextId++, title: title.trim(), author: author.trim(), year, genre };
  books.push(book);

  res.status(201).location(`/books/${book.id}`).json(book);
});

// PUT /books/:id  -> replace (all required fields must be provided)
app.put("/books/:id", (req, res) => {
  const index = books.findIndex((b) => b.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Book not found" });

  const errors = validateBook(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { title, author, year, genre } = req.body;
  books[index] = { id: books[index].id, title: title.trim(), author: author.trim(), year, genre };
  res.json(books[index]);
});

// PATCH /books/:id  -> partial update
app.patch("/books/:id", (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: "Book not found" });

  const errors = validateBook(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const { title, author, year, genre } = req.body;
  if (title !== undefined) book.title = title.trim();
  if (author !== undefined) book.author = author.trim();
  if (year !== undefined) book.year = year;
  if (genre !== undefined) book.genre = genre;

  res.json(book);
});

// DELETE /books/:id  -> remove
app.delete("/books/:id", (req, res) => {
  const index = books.findIndex((b) => b.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Book not found" });

  books.splice(index, 1);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Catches malformed JSON bodies and any unexpected errors
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Book API running at http://localhost:${PORT}`);
});