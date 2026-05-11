const Bike = require("../models/Bike");
const Ride = require("../models/Ride");
const User = require("../models/user");
const Station = require("../models/Station");

// 1. Add New Bike
exports.addBike = async (req, res) => {
  try {
    const { registration_number, currentStationId, range, speed } = req.body;

    const existingBike = await Bike.findOne({
      registration_number: registration_number.toUpperCase(),
    });

    if (existingBike) {
      return res
        .status(400)
        .json({ error: "Registration Number already exists!" });
    }

    let bikeData = {
      ...req.body,
      registration_number: registration_number.toUpperCase(),
      range: range || "80km",
      speed: speed || "45km/h",
    };

    if (req.file) {
      bikeData.image = req.file.path;
    }

    const newBike = new Bike(bikeData);
    await newBike.save();

    if (currentStationId) {
      await Station.findByIdAndUpdate(currentStationId, {
        $inc: { currentBikesCount: 1 },
      });
    }

    res.status(201).json({ message: "Bike added successfully", bike: newBike });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Bikes
exports.getAllBikes = async (req, res) => {
  try {
    const bikes = await Bike.find()
      .sort({ createdAt: -1 })
      .populate("currentStationId", "name capacity currentBikesCount");
    res.status(200).json(bikes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Bike Details
exports.updateBike = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedBike = await Bike.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedBike)
      return res.status(404).json({ message: "Bike not found" });

    res.status(200).json({ message: "Bike updated", bike: updatedBike });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete Bike
exports.deleteBike = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).json({ message: "Bike not found" });

    if (bike.currentStationId) {
      await Station.findByIdAndUpdate(bike.currentStationId, {
        $inc: { currentBikesCount: -1 },
      });
    }

    await Bike.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Bike deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Unlock Bike (Start Ride)
exports.unlockBike = async (req, res) => {
  try {
    const { bikeCode, userId, lat, lng } = req.body;

    if (!userId) return res.status(400).json({ error: "User ID is required." });

    const bike = await Bike.findOne({
      registration_number: bikeCode.toUpperCase(),
    });

    if (!bike) return res.status(404).json({ error: "Bike not found." });
    if (bike.status === "Riding")
      return res.status(400).json({ error: "Bike is already in use." });

    const newRide = new Ride({
      userId: userId,
      bikeId: bike._id,
      startStationId: bike.currentStationId,
      status: "Ongoing",
      startTime: Date.now(),
      currentLocation: { lat, lng },
      routePath: [{ lat, lng }],
    });
    await newRide.save();

    if (bike.currentStationId) {
      await Station.findByIdAndUpdate(bike.currentStationId, {
        $inc: { currentBikesCount: -1 },
      });
    }

    bike.status = "Riding";
    bike.currentStationId = null;
    bike.liveLocation = { lat, lng }; // Schema update: liveLocation field used
    await bike.save();

    res.status(200).json({ message: "Ride started!", bike, ride: newRide });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. LIVE LOCATION UPDATE
exports.updateRideLocation = async (req, res) => {
  try {
    const { rideId, bikeId, lat, lng } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (ride.status !== "Ongoing") {
      return res
        .status(400)
        .json({ error: "Ride has ended. Tracking stopped." });
    }

    ride.currentLocation = { lat, lng };
    ride.routePath.push({ lat, lng });
    await ride.save();

    // Bike schema matches liveLocation
    await Bike.findByIdAndUpdate(bikeId, { liveLocation: { lat, lng } });

    res.status(200).json({ success: true, message: "Location synced" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Lock Bike (End Ride)
exports.lockBike = async (req, res) => {
  try {
    const { bikeId, stationId, totalCost, lat, lng } = req.body;

    // 1. Fetch Active Ride
    const activeRide = await Ride.findOne({ bikeId, status: "Ongoing" });

    // --- DEBUGGING: Console Active Ride ---

    if (!activeRide) return res.status(404).json({ error: "No active ride." });

    // 2. Fetch Station
    const station = await Station.findById(stationId);
    if (!station) return res.status(404).json({ error: "Station not found." });

    // 3. Fetch User (using userId from the ride document)
    const user = await User.findById(activeRide.userId);

    // --- DEBUGGING: Console User Details ---
    console.log("--- DEBUG: USER DETAILS ---");
    console.log({
      id: user?._id,
      name: user?.name,
      currentBalance: user?.walletBalance,
      deductingAmount: totalCost
    });

    if (!user) return res.status(404).json({ error: "User not found." });

    // 4. Balance Validation
    if (user.walletBalance < totalCost) {
      console.log("--- DEBUG: INSUFFICIENT BALANCE ---");
      return res.status(400).json({ error: "Insufficient wallet balance!" });
    }

    // 5. Wallet Deduction
    await User.findByIdAndUpdate(activeRide.userId, {
      $inc: { walletBalance: -Number(totalCost) }
    });

    // 6. Ride Update
    activeRide.endTime = Date.now();
    activeRide.endStationId = stationId;
    activeRide.status = "Completed";
    activeRide.totalCost = Number(totalCost);
    activeRide.currentLocation = { lat, lng };
    activeRide.routePath.push({ lat, lng });
    await activeRide.save();

    // 7. Bike Update
    const updatedBike = await Bike.findByIdAndUpdate(
      bikeId,
      {
        status: "Available",
        currentStationId: stationId,
        isLocked: true,
        liveLocation: { lat, lng }
      },
      { new: true }
    );

    // --- DEBUGGING: Console Final Status ---
    console.log("--- DEBUG: RIDE COMPLETED SUCCESSFULLY ---");
    console.log("Bike Updated:", updatedBike.registration_number, "Status:", updatedBike.status);

    await Station.findByIdAndUpdate(stationId, { $inc: { currentBikesCount: 1 } });

    res.status(200).json({
      message: "Ride completed.",
      ride: activeRide,
      bike: updatedBike,
    });

  } catch (error) {
    console.error("--- ERROR IN LOCKBIKE ---");
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};

// 8. Get Single Bike
exports.getBikeById = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id).populate(
      "currentStationId",
    );
    if (!bike) return res.status(404).json({ message: "Bike not found" });
    res.status(200).json(bike);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
