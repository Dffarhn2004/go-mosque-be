const express = require("express");

const donasiMasjid = require("../controllers/donasi_controllers");

const authenticateJWT = require("../middleware/jwt/jwt.middleware");
const optionalAuthenticateJWT = require("../middleware/jwt/optional_jwt.middleware");

const donasiRoute = express.Router();

donasiRoute.get("/", authenticateJWT, donasiMasjid.getAllDonasi);

donasiRoute.get("/donatur", authenticateJWT, donasiMasjid.getAllDonaturMasjid);

donasiRoute.patch(
  "/:donationId/jurnal-approval",
  authenticateJWT,
  donasiMasjid.updateJurnalApproval
);

donasiRoute.get("/:idDonasiMasjid", authenticateJWT, donasiMasjid.getDonasi);

donasiRoute.post("/", optionalAuthenticateJWT, donasiMasjid.createDonasi);

module.exports = donasiRoute;
