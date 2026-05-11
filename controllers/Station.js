const Station = require("../models/Station");
const Bike = require("../models/Bike");

// 1. Saare active stations get karna
exports.getAllStations = async (req, res) => {
  try {
    const stations = await Station.find({ activeStatus: true });
    res.status(200).json(stations);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching stations", error: error.message });
  }
};

// 2. Station ki details aur wahan khari bikes check karna
exports.getStationBikes = async (req, res) => {
  try {
    const { id } = req.params;
    const station = await Station.findById(id);
    if (!station) return res.status(404).json({ message: "Station not found" });

    const bikes = await Bike.find({
      currentStationId: id,
      status: "available",
    });
    res.status(200).json({
      station,
      availableBikes: bikes,
      freeSlots: station.capacity - station.currentBikesCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching bikes", error: error.message });
  }
};

// 3. Naya Station Add karna
exports.createStation = async (req, res) => {
  try {
    // Default currentBikesCount ko 0 rakhen agar body mein nahi hai
    const stationData = {
      ...req.body,
      currentBikesCount: req.body.currentBikesCount || 0,
    };
    const newStation = new Station(stationData);
    await newStation.save();
    res.status(201).json(newStation);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating station", error: error.message });
  }
};

// 4. Update Station
exports.updateStation = async (req, res) => {
  try {
    const updated = await Station.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Station not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// 5. Delete Station
exports.deleteStation = async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: "Station not found" });

    // Agar station mein bikes hain to delete na karne den (Optional Safety)
    if (station.currentBikesCount > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete station with active bikes" });
    }

    await Station.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Station deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

// 6. Bike Park karna (Advanced Logic)
exports.parkBikeAtStation = async (req, res) => {
  const { bikeId, stationId } = req.body;

  try {
    // 1. Station check karein aur capacity check karein
    const station = await Station.findById(stationId);
    if (!station)
      return res.status(404).json({ message: "Target station not found" });

    if (station.currentBikesCount >= station.capacity) {
      return res
        .status(400)
        .json({ message: "Parking failed: Station is at full capacity" });
    }

    // 2. Bike ki purani location check karein taake wahan se count kam kar saken
    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ message: "Bike not found" });

    const oldStationId = bike.currentStationId;

    // 3. Bike ko update karein
    const updatedBike = await Bike.findByIdAndUpdate(
      bikeId,
      {
        currentStationId: stationId,
        status: "available",
        isLocked: true,
      },
      { new: true },
    );

    // 4. Counts Sync karein
    // Naye station mein +1 karein
    await Station.findByIdAndUpdate(stationId, {
      $inc: { currentBikesCount: 1 },
    });

    // Agar bike pehle kisi aur station par thi, to wahan -1 karein
    if (oldStationId && oldStationId.toString() !== stationId) {
      await Station.findByIdAndUpdate(oldStationId, {
        $inc: { currentBikesCount: -1 },
      });
    }

    res.status(200).json({
      message: "Bike parked successfully",
      updatedBike,
      availableSlots: station.capacity - (station.currentBikesCount + 1),
    });
  } catch (error) {
    res.status(500).json({ message: "Parking failed", error: error.message });
  }
};
