const express = require("express");
const cors = require("cors");
const router = require("./src/routes/main_router");

const app = express();

// Custom body parser — skip jika body sudah di-inject (serverless/Netlify)
app.use((req, _res, next) => {
  if (req.body !== undefined) return next();

  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart")) return next(); // biarkan multer handle

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf-8");
    if (!raw) { req.body = {}; return next(); }
    try {
      if (ct.includes("application/json")) {
        req.body = JSON.parse(raw);
      } else if (ct.includes("urlencoded")) {
        req.body = Object.fromEntries(new URLSearchParams(raw));
      } else {
        req.body = {};
      }
    } catch { req.body = {}; }
    next();
  });
  req.on("error", () => { req.body = {}; next(); });
});

// Enable CORS
app.use(cors({ origin: "*" }));

app.get("/", (_req, res) => {
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
