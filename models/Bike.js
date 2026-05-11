const mongoose = require("mongoose");

const bikeSchema = new mongoose.Schema(
  {
    model_name: { type: String, required: true, trim: true },
    battery_level: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 100,
    },
    // Naye Fields
    range: { type: String, default: "0km" },
    speed: { type: String, default: "0km/h" }, 
    
    price_per_hour: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Available", "Riding", "Maintenance", "Out of Service"],
      default: "Available",
    },
    registration_number: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    image: { type: String },

    isLocked: {
      type: Boolean,
      default: true,
    },
    currentStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      default: null,
    },
    liveLocation: {
      lat: { type: Number, required: true, default: 32.1886 },
      lng: { type: Number, required: true, default: 74.1804 },
    },
  },
  { timestamps: true },
);

bikeSchema.index({ "liveLocation.lat": 1, "liveLocation.lng": 1 });

module.exports = mongoose.model("Bike", bikeSchema);