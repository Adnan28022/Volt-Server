const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    address: String,
    capacity: { type: Number, default: 20 },
    currentBikesCount: { type: Number, default: 0 },
    activeStatus: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Station", stationSchema);
