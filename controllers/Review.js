const Review = require("../models/Review");
const Ride = require("../models/Ride");

// 1. Submit Review
exports.submitReview = async (req, res) => {
    try {
        const { userId, rideId, bikeId, rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating 1-5 ke beech honi chahiye" });
        }

        // Ride check karo
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ error: "Ride not found" });
        if (ride.status !== "Completed") {
            return res.status(400).json({ error: "Sirf completed rides ka review de sakte hain" });
        }
        if (ride.userId.toString() !== userId) {
            return res.status(403).json({ error: "Yeh aapki ride nahi hai" });
        }

        // Duplicate check
        const existing = await Review.findOne({ rideId, userId });
        if (existing) {
            return res.status(400).json({ error: "Is ride ka review already diya ja chuka hai" });
        }

        const review = await Review.create({
            userId, rideId, bikeId, rating, comment,
        });

        res.status(201).json({ success: true, message: "Review submit ho gaya!", review });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Get Bike Reviews
exports.getBikeReviews = async (req, res) => {
    try {
        const { bikeId } = req.params;
        const reviews = await Review.find({ bikeId })
            .populate("userId", "name")
            .sort({ createdAt: -1 });

        const avgRating = reviews.length
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : 0;

        res.status(200).json({ success: true, reviews, avgRating });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Get All Reviews (Admin)
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate("userId", "name email")
            .populate("bikeId", "registration_number model_name")
            .populate("rideId", "startTime endTime totalCost")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Check if review diya hai
exports.checkReview = async (req, res) => {
    try {
        const { rideId, userId } = req.params;
        const review = await Review.findOne({ rideId, userId });
        res.status(200).json({ success: true, hasReviewed: !!review, review });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};