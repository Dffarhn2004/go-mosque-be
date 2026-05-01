const prisma = require("../utils/prisma_client");

async function getNotificationsByUser(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

async function getUnreadNotificationCount(userId) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

async function markAllNotificationsAsRead(userId) {
  const now = new Date();

  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: now,
    },
  });

  return getNotificationsByUser(userId);
}

async function markNotificationAsRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

module.exports = {
  getNotificationsByUser,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
};
