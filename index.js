const express = require("express");
const cors = require("cors");
const router = require("./src/routes/main_router");
const loggerMiddleware = require("./src/utils/logger");

const app = express();

app.use(loggerMiddleware);

// Middleware untuk JSON
app.use(express.json());

// Middleware untuk form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

// Router utama
app.use("/api/v1", router);

// Export app for Vercel
module.exports = app;

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
