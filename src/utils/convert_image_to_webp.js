import sharp from "sharp";
import CustomError from "../utils/custom_error.js";

/**
 * Converts images to .webp format in parallel.
 * @param {Array} files - Array of image files (buffered).
 * @param {number} quality - Quality for the .webp conversion (0-100).
 * @returns {Promise<Array>} - Promise resolving to an array of converted files.
 */
export async function convertImagesToWebP(files, quality = 80) {
  return Promise.all(
    files.map(async (file) => {
      try {
        // Check if `originalname` exists and is valid
        if (!file.originalname) {
          throw new CustomError("File missing originalname");
        }

        const webpBuffer = await sharp(file.buffer)
          .webp({ quality })
          .toBuffer();

        return {
          ...file,
          buffer: webpBuffer,
          originalname: `${file.originalname.split(".")[0]}.webp`,
          mimetype: "image/webp",
        };
      } catch (error) {
        throw new CustomError(
          `Error converting image ${file.originalname || "unknown file"}`,
          400
        );
      }
    })
  );
}
