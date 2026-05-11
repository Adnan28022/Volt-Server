const express = require("express");
const {
  getAllStations,
  getStationBikes,
  createStation,
  updateStation,
  deleteStation,
  parkBikeAtStation,
} = require("../controllers/Station");
const router = express.Router();

// Get all
router.get("/", getAllStations);

// Get specific station details
router.get("/:id", getStationBikes);

// Admin: Add station
router.post("/add", createStation);

// Update station
router.put("/:id", updateStation);

// Delete station
router.delete("/:id", deleteStation);

// Park bike (New Route)
router.post("/park", parkBikeAtStation);

module.exports = router;
