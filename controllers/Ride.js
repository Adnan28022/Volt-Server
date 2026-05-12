const Ride = require("../models/Ride");
const User = require("../models/user"); 
const Bike = require("../models/Bike"); 
const Station = require("../models/Station");

// 1. Get All Rides (Admin Dashboard)
exports.getAllRides = async (req, res) => {
  try {
    // Populate tabhi kaam karega jab models memory mein registered hon
    const rides = await Ride.find()
      .populate({
        path: "userId",
        select: "name email",
        model: User 
      })
      .populate({
        path: "bikeId",
        select: "registration_number brand",
        model: Bike
      })
      .populate({
        path: "startStationId",
        select: "name",
        model: Station
      })
      .populate({
        path: "endStationId",
        select: "name",
        model: Station
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ 
        success: true, 
        count: rides.length, 
        rides 
    });
  } catch (error) {
    res.status(500).json({ 
        success: false, 
        error: error.message 
    });
  }
};

// 2. Get User's Ride History (Mobile/User Profile ke liye)
// 2. Get User's Ride History
exports.getUserRides = async (req, res) => {
  try {
    const { userId } = req.params;
    const rides = await Ride.find({ userId })
      .populate({
        path: "userId",
        select: "name email phone",  // ✅ name email add kiya
        model: User
      })
      .populate({
        path: "bikeId",
        select: "registration_number model_name brand image price_per_hour",  // ✅ model_name add kiya
        model: Bike
      })
      .populate("startStationId endStationId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Get Active Ride (Frontend QuickUnlock Toggle ke liye)
exports.getActiveRide = async (req, res) => {
  try {
    const { userId } = req.params;
    const activeRide = await Ride.findOne({
      userId,
      status: "Ongoing",
    }).populate("bikeId", "registration_number brand battery_level");

    if (!activeRide) {
      return res
        .status(200)
        .json({ success: true, active: false, message: "No active ride" });
    }

    res.status(200).json({ success: true, active: true, ride: activeRide });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Bulk Check Active Status (Multiple users ke liye)
exports.checkBulkActiveStatus = async (req, res) => {
  try {
    const { userIds } = req.body; // Array of IDs expected

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds must be an array" });
    }

    const activeRides = await Ride.find({
      userId: { $in: userIds },
      status: "Ongoing",
    }).select("userId bikeId");

    // Map create karna taake frontend ko asani ho
    const activeMap = {};
    userIds.forEach((id) => {
      activeMap[id] = activeRides.some(
        (ride) => ride.userId.toString() === id.toString(),
      );
    });

    res.status(200).json({ success: true, activeMap });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Get Specific Ride Details
exports.getRideDetails = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("userId", "name phone")
      .populate("bikeId")
      .populate("startStationId endStationId");

    if (!ride) return res.status(404).json({ error: "Ride not found" });

    res.status(200).json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
