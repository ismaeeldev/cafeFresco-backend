const express = require('express');
const isLogged = require('../middleware/isLogged');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const Payment = require('../models/payment')

// Create Payment Intent
router.post('/payment-intent', isLogged, async (req, res) => {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number') {
        return res.status(400).json({ message: 'Invalid amount provided' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
        });

        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



router.post('/payment/create', isLogged, async (req, res) => {
    try {
        const {
            orderId,
            paymentMethod,
            transactionId,
            amount,
            paymentDetails = {}
        } = req.body;

        const userId = req.user.userId;

        // Create new payment
        const newPayment = new Payment({
            orderId,
            userId,
            paymentMethod,
            transactionId,
            amount,
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Completed',
            paymentDetails
        });

        await newPayment.save();

        res.status(201).json({
            message: 'Payment recorded successfully',
            payment: newPayment
        });

    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


module.exports = router;