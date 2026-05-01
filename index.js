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

// Export app for Vercel & Netlify
module.exports = app;

// Start server only if not in serverless environment
if (!process.env.VERCEL && !process.env.NETLIFY) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
