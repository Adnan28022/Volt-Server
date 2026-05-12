const express = require("express");
const {
    submitReview,
    getBikeReviews,
    getAllReviews,
    checkReview,
} = require("../controllers/Review");

const router = express.Router();

router.post("/submit", submitReview);
router.get("/bike/:bikeId", getBikeReviews);
router.get("/all", getAllReviews);
router.get("/check/:rideId/:userId", checkReview);

module.exports = router;