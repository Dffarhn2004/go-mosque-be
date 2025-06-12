// src/config/multerConfig.js
import multer from "multer";

// Configure multer to store files in memory
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // limit file size to 10MB for example
});

export default upload;