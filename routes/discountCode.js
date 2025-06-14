const express = require('express');
const DiscountCode = require('../models/discountCode');
const router = express.Router();
const isLogged = require('../middleware/isLogged');
const { isAdmin, authorizeRoles } = require('../middleware/isAdmin')

// ✅ Admin: Create a new discount code
router.post('/create', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const { code, discountPercentage, expiryDate, minPurchase, maxUses } = req.body;

        const existingCode = await DiscountCode.findOne({ code });
        if (existingCode) {
            return res.status(400).json({ message: 'Discount code already exists' });
        }

        const newCode = new DiscountCode({
            code,
            discountPercentage,
            expiryDate,
            minPurchase,
            maxUses
        });

        await newCode.save();
        res.status(201).json({ message: 'Discount code created successfully', code: newCode });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/update/:id', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { discountPercentage, expiryDate, minPurchase, maxUses } = req.body;

        const existingCode = await DiscountCode.findById(id);
        if (!existingCode) {
            return res.status(404).json({ message: 'Discount code not found' });
        }

        // Do NOT update the 'code' field
        existingCode.discountPercentage = discountPercentage;
        existingCode.expiryDate = expiryDate;
        existingCode.minPurchase = minPurchase;
        existingCode.maxUses = maxUses;

        await existingCode.save();

        res.status(200).json({ message: 'Discount code updated successfully', code: existingCode });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ✅ User: Apply discount code during checkout
router.post('/apply', isLogged, async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const userId = req.user.id;

        const trimmedCode = code.trim();
        const discountCode = await DiscountCode.findOne({ code: trimmedCode });

        if (!discountCode) {
            return res.status(400).json({ message: 'Invalid discount code' });
        }

        // Check if code is expired
        if (new Date() > new Date(discountCode.expiryDate)) {
            return res.status(400).json({ message: 'Discount code has expired' });
        }

        // Check if user has already used the code
        if (discountCode.usedBy.includes(userId)) {
            return res.status(400).json({ message: 'You have already used this discount code' });
        }

        // Check minimum purchase requirement
        if (cartTotal < discountCode.minPurchase) {
            return res.status(400).json({ message: `Minimum purchase should be ${discountCode.minPurchase}` });
        }

        // Apply discount
        const discountAmount = (cartTotal * discountCode.discountPercentage) / 100;
        const newTotal = cartTotal - discountAmount;

        // Mark the code as used
        discountCode.usedBy.push(userId);
        await discountCode.save();

        res.status(200).json({
            message: 'Discount applied successfully',
            discountAmount,
            newTotal
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ✅ Admin: Delete a discount code
router.delete('/delete/:id', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        await DiscountCode.findByIdAndDelete(req.params.id);
        res.json({ message: 'Discount code deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/fetch', isAdmin, authorizeRoles("admin"), async (req, res) => {

    try {

        const allCode = await DiscountCode.find();
        res.status(200).json({ allCode });

    } catch (error) {
        res.status(500).json({ message: 'Server Error ', error: error.message })
    }
})


module.exports = router;
