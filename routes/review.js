const express = require('express');
const router = express.Router();
const reviewModal = require('../models/review');
const productModal = require('../models/product');
const isLogged = require('../middleware/isLogged');


// Add a review to a product
router.post('/add/:productId', isLogged, async (req, res) => {
    try {
        const { rating, review } = req.body;
        const productId = req.params.productId;
        const userId = req.user.id;

        // Check if user has already reviewed this product
        const existingReview = await reviewModal.findOne({ user: userId, product: productId });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Create a new review
        const Newreview = new reviewModal({
            user: userId,
            product: productId,
            rating,
            review
        });

        await Newreview.save();

        // Add the review to the product
        const product = await productModal.findById(productId);
        product.reviews.push(review._id);

        // Update the average rating
        const allReviews = await reviewModal.find({ product: productId });
        const totalRatings = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        product.averageRating = totalRatings / allReviews.length;

        await product.save();

        res.status(201).json({ message: 'Review added successfully', review });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all reviews for a product
router.get('/all/:productId', async (req, res) => {
    try {
        const reviews = await reviewModal.find({ product: req.params.productId }).populate('user', 'name'); // Populate user name
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;