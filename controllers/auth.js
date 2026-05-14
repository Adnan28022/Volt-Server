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

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 mins valid
    await user.save();

    await transporter.sendMail({
      from: `"Volt-Ride" <${process.env.EMAIL}>`,
      to: email,
      subject: "Password Reset OTP - Volt-Ride",
      text: `Your OTP for password reset is ${otp}. It will expire in 10 minutes.`,
      html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .header { background-color: #064e3b; padding: 40px 20px; text-align: center; }
            .logo { font-size: 28px; font-weight: 900; color: #10b981; font-style: italic; text-transform: uppercase; letter-spacing: -1px; }
            .content { padding: 40px; text-align: center; color: #334155; }
            h1 { font-size: 22px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; color: #0f172a; }
            p { font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 30px; }
            .otp-container { background: #f8fafc; border: 2px dashed #e2e8f0; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 30px; }
            .otp-code { font-size: 36px; font-weight: 900; color: #059669; letter-spacing: 10px; margin: 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
            .warning { font-size: 12px; color: #ef4444; font-weight: bold; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">VOLT-RIDE</div>
            </div>
            <div class="content">
                <h1>Reset Your Access</h1>
                <p>Humne aapke password reset ki request receive ki hai. Neeche diya gaya OTP code use karein:</p>
                
                <div class="otp-container">
                    <div class="otp-code">${otp}</div>
                </div>

                <p>Ye code sirf <strong>10 minutes</strong> ke liye valid hai. Agar aapne ye request nahi ki, toh is email ko ignore karein.</p>
                
                <div class="warning">Security Warning: Kisi ke sath bhi apna OTP share na karein.</div>
            </div>
            <div class="footer">
                &copy; 2026 Volt-Ride Inc. | Secure Mobility Solutions
            </div>
        </div>
    </body>
    </html>
  `,
    });

    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // OTP Check
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpire < Date.now()) return res.status(400).json({ message: "OTP expired" });

    // Update Password
    user.password = newPassword; // model.pre("save") automatic hash kar dega
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful! You can now login." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};