const express = require("express");
const router = express.Router();

// Controllers
const {
  register,
  login,
  logout,
  verifyOTP,
  resendOTP,
  getAllUsers,
  forgotPassword,
  resetPassword,
  deleteUser,
} = require("../controllers/auth");

// Middleware
const { isAuthenticated } = require("../middleware/authMiddleware");

// ================= AUTH ROUTES =================

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.get("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/users", isAuthenticated, getAllUsers);
router.delete("/user/:id", isAuthenticated, deleteUser);


// ================= PROTECTED ROUTE =================
router.get("/me", isAuthenticated, (req, res) => {
  res.status(200).json({
    success: true,
    message: "User data accessed",
    user: req.userId,
  });
});

module.exports = router;
