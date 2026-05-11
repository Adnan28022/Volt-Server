const express = require("express");
const multer = require("multer");
const {
  addBike,
  getAllBikes,
  getBikeById,
  updateBike,
  deleteBike,
  unlockBike,
  lockBike,
  updateRideLocation,
} = require("../controllers/Bike");

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// API Endpoints
router.post("/add", upload.single("image"), addBike);
router.get("/all", getAllBikes);
router.get("/:id", getBikeById);
router.put("/update/:id", upload.single("image"), updateBike);
router.delete("/delete/:id", deleteBike);

router.post("/unlock", unlockBike);
router.post("/lock", lockBike);

router.post("/update-location", updateRideLocation);

module.exports = router;
