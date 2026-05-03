const express = require("express");

const donasiMasjidController = require("../controllers/donasi_masjid_controllers");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");
const optionalAuthenticateJWT = require("../middleware/jwt/optional_jwt.middleware");
const { default: upload } = require("../utils/multer");

const donasiMasjidRoute = express.Router();

donasiMasjidRoute.get(
  "/",
  donasiMasjidController.getAllDonasiMasjidUser
);
donasiMasjidRoute.get(
  "/takmir",
  authenticateJWT,
  donasiMasjidController.getAllDonasiMasjid
);


donasiMasjidRoute.get(
  "/:idDonasiMasjid",
  optionalAuthenticateJWT,
  donasiMasjidController.getDonasiMasjidUser
);
donasiMasjidRoute.get(
  "/takmir/:idDonasiMasjid",
  authenticateJWT,
  donasiMasjidController.getDonasiMasjid
);

donasiMasjidRoute.post(
  "/",
  upload.fields([{ name: "FotoThumbnailDonasi", maxCount: 1 }]),
  authenticateJWT,
  donasiMasjidController.createDonasiMasjid
);

module.exports = donasiMasjidRoute;
