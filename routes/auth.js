const express = require("express");
const router = express.Router();
const User = require("../models/user"); // ✅ Add karo

const {
  register, login, logout, verifyOTP, resendOTP,
  getAllUsers, forgotPassword, resetPassword, deleteUser,
} = require("../controllers/auth");

const { isAuthenticated } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.get("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/users", isAuthenticated, getAllUsers);
router.delete("/user/:id", isAuthenticated, deleteUser);

// ✅ FCM Token save
router.post("/save-fcm-token", async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: "userId and fcmToken required" });
    }
    await User.findByIdAndUpdate(userId, { fcmToken });
    console.log("✅ FCM Token saved for user:", userId);
    res.status(200).json({ success: true, message: "Token saved" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", isAuthenticated, (req, res) => {
  res.status(200).json({ success: true, user: req.userId });
});

module.exports = router;