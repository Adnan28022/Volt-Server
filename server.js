const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

dotenv.config();

const connectDB = require("./config/db");

const userRoutes = require("./routes/auth");
const bikeRoutes = require("./routes/Bike");
const stationRoutes = require("./routes/Stations");
const rideRoutes = require("./routes/Ride");
const paymentRoutes = require("./routes/Payment");
const reviewRoutes = require("./routes/Review")

const app = express();

connectDB();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const allowedOrigins = [
  "https://volt-ride-neon.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/auth", userRoutes);
app.use("/api/bikes", bikeRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reviews", reviewRoutes)

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server running fine 🚀, With Mongo Change.",
  });
});

// ✅ LOCAL ONLY
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// ✅ REQUIRED FOR VERCEL
module.exports = app;
