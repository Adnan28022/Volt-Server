const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

// dotenv.config() yahan lazmi hona chahiye taake variables load hon
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// Transporter verify karne ke liye (Optional debugging)
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email Service Error: " + error.message);
  } else {
    console.log("✅ Email Server is ready to send messages");
  }
});

module.exports = transporter;
