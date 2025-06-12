const express = require("express");

const donasiMasjid = require("../controllers/donasi_controllers");

const authenticateJWT = require("../middleware/jwt/jwt.middleware");

const donasiRoute = express.Router();

donasiRoute.get("/", authenticateJWT, donasiMasjid.getAllDonasi);

donasiRoute.get("/donatur", authenticateJWT, donasiMasjid.getAllDonaturMasjid);

donasiRoute.get("/:idDonasiMasjid", authenticateJWT, donasiMasjid.getDonasi);

donasiRoute.post("/", authenticateJWT, donasiMasjid.createDonasi);

module.exports = donasiRoute;
