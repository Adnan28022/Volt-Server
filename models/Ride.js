const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bikeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
      required: true,
    },
    startStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
    },
    endStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      default: null,
    },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    routePath: [
      {
        lat: { type: Number },
        lng: { type: Number },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Ongoing", "Completed", "Cancelled"],
      default: "Ongoing",
    },
    totalCost: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ride", rideSchema);
