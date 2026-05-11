const express = require("express");
const router = express.Router();
const {
  getAllRides,
  getUserRides,
  getActiveRide,
  checkBulkActiveStatus,
  getRideDetails,
} = require("../controllers/Ride");

// --- ADMIN ROUTES ---
router.get("/all", getAllRides); 

// --- USER & UTILITY ROUTES ---
router.get("/user/:userId", getUserRides); 
router.get("/active/:userId", getActiveRide); 
router.get("/details/:id", getRideDetails); 

// --- BULK ACTION ---
router.post("/check-bulk", checkBulkActiveStatus); 

module.exports = router;
