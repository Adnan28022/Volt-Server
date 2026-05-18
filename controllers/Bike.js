const Bike = require("../models/Bike");
const Ride = require("../models/Ride");
const User = require("../models/user");
const Station = require("../models/Station");
const { sendNotification, sendAdminNotification } = require(".././utils/sendNotifications");

// 1. Add New Bike
exports.addBike = async (req, res) => {
  try {
    const { registration_number, currentStationId, range, speed } = req.body;
    const existingBike = await Bike.findOne({ registration_number: registration_number.toUpperCase() });
    if (existingBike) return res.status(400).json({ error: "Registration Number already exists!" });

    let bikeData = {
      ...req.body,
      registration_number: registration_number.toUpperCase(),
      range: range || "80km",
      speed: speed || "45km/h",
    };
    if (req.file) bikeData.image = req.file.path;

    const newBike = new Bike(bikeData);
    await newBike.save();

    if (currentStationId) {
      await Station.findByIdAndUpdate(currentStationId, { $inc: { currentBikesCount: 1 } });
    }
    res.status(201).json({ message: "Bike added successfully", bike: newBike });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Bikes
exports.getAllBikes = async (req, res) => {
  try {
    const bikes = await Bike.find().sort({ createdAt: -1 }).populate("currentStationId", "name capacity currentBikesCount");
    res.status(200).json(bikes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Bike Details
exports.updateBike = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.image = req.file.path;
    const updatedBike = await Bike.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updatedBike) return res.status(404).json({ message: "Bike not found" });
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
      await Station.findByIdAndUpdate(bike.currentStationId, { $inc: { currentBikesCount: -1 } });
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

    const bike = await Bike.findOne({ registration_number: bikeCode.toUpperCase() });
    if (!bike) return res.status(404).json({ error: "Bike not found." });
    if (bike.status === "Riding") return res.status(400).json({ error: "Bike is already in use." });

    const newRide = new Ride({
      userId,
      bikeId: bike._id,
      startStationId: bike.currentStationId,
      status: "Ongoing",
      startTime: Date.now(),
      currentLocation: { lat, lng },
      routePath: [{ lat, lng }],
    });
    await newRide.save();

    if (bike.currentStationId) {
      await Station.findByIdAndUpdate(bike.currentStationId, { $inc: { currentBikesCount: -1 } });
    }

    bike.status = "Riding";
    bike.currentStationId = null;
    bike.liveLocation = { lat, lng };
    await bike.save();

    // ✅ User ko ride start notification
    const user = await User.findById(userId);
    if (user?.fcmToken) {
      await sendNotification({
        token: user.fcmToken,
        title: "🚴 Ride Started!",
        body: `Bike ${bike.registration_number} unlock ho gayi. Safe ride karein!`,
        data: { type: "ride_start", rideId: newRide._id.toString() },
      });
    }

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
    if (ride.status !== "Ongoing") return res.status(400).json({ error: "Ride has ended. Tracking stopped." });

    ride.currentLocation = { lat, lng };
    ride.routePath.push({ lat, lng });
    await ride.save();
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

    const activeRide = await Ride.findOne({ bikeId, status: "Ongoing" });
    if (!activeRide) return res.status(404).json({ error: "No active ride." });

    const station = await Station.findById(stationId);
    if (!station) return res.status(404).json({ error: "Station not found." });

    const user = await User.findById(activeRide.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.walletBalance < totalCost) {
      return res.status(400).json({ error: "Insufficient wallet balance!" });
    }

    // Wallet deduct
    await User.findByIdAndUpdate(activeRide.userId, {
      $inc: { walletBalance: -Number(totalCost) }
    });

    // Ride complete
    activeRide.endTime = Date.now();
    activeRide.endStationId = stationId;
    activeRide.status = "Completed";
    activeRide.totalCost = Number(totalCost);
    activeRide.currentLocation = { lat, lng };
    activeRide.routePath.push({ lat, lng });
    await activeRide.save();

    // Bike update
    const updatedBike = await Bike.findByIdAndUpdate(
      bikeId,
      { status: "Available", currentStationId: stationId, isLocked: true, liveLocation: { lat, lng } },
      { new: true }
    );

    await Station.findByIdAndUpdate(stationId, { $inc: { currentBikesCount: 1 } });

    // ✅ User ko ride complete notification
    if (user?.fcmToken) {
      await sendNotification({
        token: user.fcmToken,
        title: "✅ Ride Complete!",
        body: `Ride khatam ho gayi. Rs. ${totalCost} wallet se deduct hue. Shukriya!`,
        data: {
          type: "ride_complete",
          rideId: activeRide._id.toString(),
          amount: totalCost.toString(),
        },
      });
    }

    // ✅ Admin ko ride complete notification
    await sendAdminNotification({
      title: "🏁 Ride Completed",
      body: `${user?.name || "User"} ki ride complete — Rs. ${totalCost} | ID: ${activeRide._id.toString().slice(-6).toUpperCase()}`,
      data: {
        type: "admin_ride_complete",
        rideId: activeRide._id.toString(),
        userId: activeRide.userId.toString(),
        amount: totalCost.toString(),
      },
    });

    res.status(200).json({ message: "Ride completed.", ride: activeRide, bike: updatedBike });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 8. Get Single Bike
exports.getBikeById = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id).populate("currentStationId");
    if (!bike) return res.status(404).json({ message: "Bike not found" });
    res.status(200).json(bike);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};