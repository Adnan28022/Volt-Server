const express = require("express");
const {
    createPaymentIntent,
    confirmPayment,
    recordDeduction,
    getUserPayments,
    getAllPayments,
} = require("../controllers/Payment");

const router = express.Router();

router.post("/create-intent", createPaymentIntent);  
router.post("/confirm", confirmPayment);             
router.post("/deduct", recordDeduction);             
router.get("/user/:userId", getUserPayments);        
router.get("/all", getAllPayments);                  

module.exports = router;