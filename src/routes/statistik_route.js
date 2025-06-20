const express = require("express");
const statistikController = require("../controllers/statistik_controller");

const statistikRouter = express.Router();

// Routes
statistikRouter.get("/:id", statistikController.getStatistik);

module.exports = statistikRouter;
