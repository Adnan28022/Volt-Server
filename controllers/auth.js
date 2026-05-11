const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const transporter = require("../config/email");

const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const otp = generateOTP();

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || "user",
      otp,
      otpExpire: Date.now() + 10 * 60 * 1000,
    });

    await transporter.sendMail({
      from: `"Volt-Ride" <${process.env.EMAIL}>`,
      to: email,
      subject: "Email Verification OTP",
      text: `Your OTP for Volt-X is ${otp}. It will expire in 10 minutes.`,
    });

    res
      .status(201)
      .json({ success: true, message: "User registered! OTP sent to email." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= VERIFY OTP =================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp != otp)
      return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpire < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Account verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (!user.isVerified)
      return res
        .status(400)
        .json({ success: false, message: "Please verify email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    // Create Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    // Store in Cookie
    res.cookie("token", token, {
      httpOnly: true, // XSS attacks se bachne ke liye
      secure: process.env.NODE_ENV === "production", // Sirf HTTPS par chalega production mein
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 Din
    });

    res.status(200).json({
      success: true,
      message: `Welcome back ${user.name}`,
      token, // Frontend ke liye bhi bhej rahe hain
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        walletBalance: user.walletBalance,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= RESEND OTP =================
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Resend OTP",
      text: `Your OTP is ${otp}`,
    });

    res.status(200).json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGOUT =================
exports.logout = (req, res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// ================= GET ALL USERS =================
exports.getAllUsers = async (req, res) => {
  try {
    // .select("-password") se password hash frontend par nahi jayega
    // .sort({ createdAt: -1 }) se new users pehle dikhen ge
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// ================= DELETE USER =================
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Admin khud ko delete na kar sakay (Optional Check)
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin accounts cannot be deleted directly.",
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};
