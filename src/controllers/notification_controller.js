const notificationService = require("../services/notification_service");
const { successResponse, errorResponse } = require("../utils/response");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotificationsByUser(
      req.user.id
    );

    return successResponse(
      res,
      "Notifications fetched successfully",
      notifications
    );
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return errorResponse(res, "Failed to fetch notifications: " + error.message);
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadNotificationCount(
      req.user.id
    );

    return successResponse(res, "Unread count fetched successfully", { count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return errorResponse(res, "Failed to fetch unread count: " + error.message);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const notifications = await notificationService.markAllNotificationsAsRead(
      req.user.id
    );

    return successResponse(
      res,
      "All notifications marked as read",
      notifications
    );
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return errorResponse(
      res,
      "Failed to mark notifications as read: " + error.message
    );
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await notificationService.markNotificationAsRead(
      req.params.notificationId,
      req.user.id
    );

    return successResponse(res, "Notification marked as read", null);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return errorResponse(
      res,
      "Failed to mark notification as read: " + error.message
    );
  }
};
