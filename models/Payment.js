const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ["topup", "deduction"],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "succeeded", "failed"],
            default: "pending",
        },
        stripePaymentIntentId: {
            type: String,
            default: null,
        },
        description: {
            type: String,
            default: "",
        },
        balanceAfter: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);