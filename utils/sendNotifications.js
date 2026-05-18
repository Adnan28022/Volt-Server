const admin = require("../config/firebase");
const User = require("../models/user");

// Single user ko notification
const sendNotification = async ({ token, title, body, data = {} }) => {
    if (!token) return;
    try {
        await admin.messaging().send({
            token,
            notification: { title, body },
            data,
            webpush: {
                notification: {
                    title,
                    body,
                    icon: "/logo.png",
                },
            },
        });
    } catch (error) {
        console.error("Notification error:", error.message);
    }
};

// Sabhi admins ko notification
const sendAdminNotification = async ({ title, body, data = {} }) => {
    try {
        const admins = await User.find({ role: "admin", fcmToken: { $ne: null } });
        const promises = admins.map((a) =>
            sendNotification({ token: a.fcmToken, title, body, data })
        );
        await Promise.all(promises);
    } catch (error) {
        console.error("Admin notification error:", error.message);
    }
};

module.exports = { sendNotification, sendAdminNotification };