const express = require('express');
const router = express.Router();
const productModel = require('../models/product');
const userInterest = require('../models/userInterest');

router.get('/search', async (req, res) => {
    try {
        const { query, userId } = req.query;

        if (userId) {
            await userInterest.findOneAndUpdate(
                { userId },
                { $push: { searches: query } },
                { upsert: true, new: true }
            );
        }

        // Find matching products
        const products = await productModel.find({ name: { $regex: query, $options: 'i' } });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Error in search", error });
    }
});


router.post('/view-product', async (req, res) => {
    try {
        const { userId, productId } = req.body;

        await userInterest.findOneAndUpdate(
            { userId },
            { $addToSet: { viewedProducts: productId } },
            { upsert: true, new: true }
        );

        res.json({ message: "Product viewed logged successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error logging product view", error });
    }
});




router.get('/recommend/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch user history with populated viewedProducts
        const userHistory = await userInterest.findOne({ userId }).populate("viewedProducts");

        if (!userHistory) {
            return res.status(404).json({ message: "No user history found" });
        }

        const recentSearches = userHistory.searches.slice(-3); // Last 3 searches
        const viewedCategories = userHistory.viewedProducts.map(product => product.category);

        let recommendations = [];

        // Step 1: Get products based on recent searches
        if (recentSearches.length > 0) {
            const searchBasedProducts = await productModel.aggregate([
                { $match: { name: { $in: recentSearches.map(term => new RegExp(term, 'i')) } } },
                { $sample: { size: 6 } } // Randomly select products
            ]);

            recommendations = searchBasedProducts;
        }

        // Step 2: If fewer than 6 products, use viewed products' categories
        if (recommendations.length < 6 && viewedCategories.length > 0) {
            const viewedBasedProducts = await productModel.aggregate([
                { $match: { category: { $in: viewedCategories } } },
                { $sample: { size: 6 - recommendations.length } } // Fill the remaining slots
            ]);

            recommendations = [...recommendations, ...viewedBasedProducts];
        }

        res.json(recommendations);
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        res.status(500).json({ message: "Error fetching recommendations", error: error.message });
    }
});

module.exports = router;