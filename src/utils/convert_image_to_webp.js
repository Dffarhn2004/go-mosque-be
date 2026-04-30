const sharp = require("sharp");
const CustomError = require("./custom_error");

async function convertImagesToWebP(files, quality = 80) {
  return Promise.all(
    files.map(async (file) => {
      try {
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

module.exports = { convertImagesToWebP };
