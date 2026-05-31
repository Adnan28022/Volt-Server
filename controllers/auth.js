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
      subject: "Welcome to Volt-Ride! Verify Your Account",
      text: `Your OTP for account verification is ${otp}. It will expire in 10 minutes.`,
      html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f0fdf4; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #dcfce7; }
            .hero { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 50px 20px; text-align: center; position: relative; }
            .logo { font-size: 32px; font-weight: 900; color: #10b981; font-style: italic; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 10px; }
            .welcome-badge { background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 10px; font-weight: 800; padding: 5px 15px; border-radius: 20px; text-transform: uppercase; letter-spacing: 2px; display: inline-block; }
            .content { padding: 40px; text-align: center; }
            h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 15px; }
            p { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 30px; }
            .otp-card { background: #ffffff; border: 2px solid #f1f5f9; padding: 25px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); display: inline-block; min-width: 250px; }
            .otp-label { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; display: block; }
            .otp-code { font-size: 42px; font-weight: 900; color: #059669; letter-spacing: 12px; margin-left: 12px; /* For centering spaced digits */ }
            .benefits { margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 25px; display: flex; justify-content: center; gap: 20px; }
            .benefit-item { font-size: 12px; color: #64748b; font-weight: 600; }
            .footer { background: #f8fafc; padding: 25px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.8; }
            .highlight { color: #059669; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="hero">
                <div class="logo">VOLT-RIDE</div>
                <div class="welcome-badge">New Member Registration</div>
            </div>
            <div class="content">
                <h1>Verify Your Identity</h1>
                <p>Welcome to the future of mobility! You're just one last step away from joining the Volt-Ride family. Please enter the code below to verify your account.:</p>
                
                <div class="otp-card">
                    <span class="otp-label">Verification Code</span>
                    <div class="otp-code">${otp}</div>
                </div>

                <div class="benefits">
                    <span class="benefit-item">⚡ Fast Rides</span>
                    <span class="benefit-item">🛡️ Secure Travel</span>
                    <span class="benefit-item">🌱 Eco Friendly</span>
                </div>
            </div>
            <div class="footer">
                Aap ye email isliye dekh rahe hain kyunki aapne <strong>Volt-Ride</strong> par register kiya hai.<br/>
                &copy; 2026 Volt-Ride Inc. | Gujranwala, Pakistan.
            </div>
        </div>
    </body>
    </html>
  `,
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
// ================= LOGIN (Updated for Vercel) =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (!user.isVerified)
      return res.status(400).json({ success: false, message: "Please verify email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ FIXED FOR VERCEL: sameSite "none" and secure "true" is mandatory
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,      // Must be true for HTTPS (Vercel)
      sameSite: "none",  // Must be "none" for cross-domain requests
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: `Welcome back ${user.name}`,
      token,
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
      from: `"Volt-Ride" <${process.env.EMAIL}>`,
      to: email,
      subject: "Your New OTP - Volt-Ride",
      text: `Your new OTP is ${otp}. It will expire in 10 minutes.`,
      html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f9fafb; padding-bottom: 40px; }
            .main { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; margin-top: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.03); }
            .header { background-color: #022c22; padding: 30px; text-align: center; }
            .brand { font-size: 24px; font-weight: 900; color: #10b981; font-style: italic; text-transform: uppercase; letter-spacing: 1px; }
            .body-content { padding: 40px; text-align: center; }
            .icon-box { width: 60px; height: 60px; background: #ecfdf5; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 30px; line-height: 60px; }
            h2 { color: #0f172a; font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 10px 0; }
            p { color: #64748b; font-size: 14px; margin-bottom: 30px; line-height: 1.5; }
            .otp-badge { background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 15px 30px; border-radius: 16px; display: inline-block; }
            .otp-text { font-size: 32px; font-weight: 900; color: #064e3b; letter-spacing: 8px; margin: 0; }
            .footer { padding: 30px; text-align: center; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
            .help-text { font-size: 12px; color: #94a3b8; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="main">
                <div class="header">
                    <div class="brand">VOLT-RIDE</div>
                </div>
                <div class="body-content">
                    <div class="icon-box">⚡</div>
                    <h2>New OTP Requested</h2>
                    <p>Aapne OTP resend karne ki request ki thi. Apna naya verification code neeche dekhein:</p>
                    
                    <div class="otp-badge">
                        <div class="otp-text">${otp}</div>
                    </div>

                    <p class="help-text">Ye code 10 minutes mein expire ho jayega.<br/>Agar aapne ye request nahi ki, toh foran apna password change karein.</p>
                </div>
                <div class="footer">
                    &copy; 2026 Volt-Ride | Smart & Secure Rides
                </div>
            </div>
        </div>
    </body>
    </html>
  `,
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