const Stripe = require("stripe");
const Payment = require("../models/Payment");
const User = require("../models/user");
const { sendNotification } = require(".././utils/sendNotifications");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 1. Create Payment Intent
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, userId } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: "pkr",
            metadata: { userId },
        });
        await Payment.create({
            userId, amount, type: "topup",
            status: "pending",
            stripePaymentIntentId: paymentIntent.id,
        });
        res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Confirm Payment & Add to Wallet
exports.confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== "succeeded") {
            await Payment.findOneAndUpdate({ stripePaymentIntentId: paymentIntentId }, { status: "failed" });
            return res.status(400).json({ error: "Payment not successful" });
        }

        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
        if (!payment) return res.status(404).json({ error: "Payment not found" });

        const user = await User.findByIdAndUpdate(
            payment.userId,
            { $inc: { walletBalance: payment.amount } },
            { new: true }
        );

        payment.status = "succeeded";
        payment.balanceAfter = user.walletBalance;
        await payment.save();

        // ✅ User ko wallet topup notification
        if (user?.fcmToken) {
            await sendNotification({
                token: user.fcmToken,
                title: "💰 Wallet Top-up!",
                body: `Rs. ${payment.amount} add ho gaye! New balance: Rs. ${user.walletBalance}`,
                data: {
                    type: "wallet_topup",
                    amount: payment.amount.toString(),
                    balance: user.walletBalance.toString(),
                },
            });
        }

        res.json({ success: true, walletBalance: user.walletBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Ride Deduction
exports.recordDeduction = async (req, res) => {
    try {
        const { userId, amount, rideId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.walletBalance < amount) return res.status(400).json({ error: "Insufficient balance" });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { walletBalance: -Number(amount) } },
            { new: true }
        );

        await Payment.create({
            userId, amount, type: "deduction",
            status: "succeeded",
            description: `Ride charge Rs. ${amount}`,
            balanceAfter: updatedUser.walletBalance,
        });

        res.status(200).json({ success: true, message: `Rs. ${amount} deducted`, walletBalance: updatedUser.walletBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Get User Payments
exports.getUserPayments = async (req, res) => {
    try {
        const { userId } = req.params;
        const payments = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(20);
        res.status(200).json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Get All Payments (Admin)
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate("userId", "name email").sort({ createdAt: -1 });
        res.status(200).json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};