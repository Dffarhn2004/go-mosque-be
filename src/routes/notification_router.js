const express = require("express");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");
const notificationController = require("../controllers/notification_controller");

const notificationRouter = express.Router();

notificationRouter.use(authenticateJWT);

notificationRouter.get("/", notificationController.getNotifications);
notificationRouter.get("/unread-count", notificationController.getUnreadCount);
notificationRouter.patch("/read-all", notificationController.markAllAsRead);
notificationRouter.patch("/:notificationId/read", notificationController.markAsRead);

module.exports = notificationRouter;
