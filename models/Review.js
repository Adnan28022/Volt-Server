const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        rideId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ride",
            required: true,
        },
        bikeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bike",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    { timestamps: true }
);

// Ek ride ka sirf ek review
reviewSchema.index({ rideId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);