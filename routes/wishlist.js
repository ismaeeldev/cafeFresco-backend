const express = require('express');
const router = express.Router();
const userModel = require('../models/user');
const Wishlist = require('../models/wishlist');
const isLogged = require('../middleware/isLogged');

router.post('/add', isLogged, async (req, res) => {
    try {
        const checkUser = req.user;
        const { productId } = req.body;

        // Find the user
        const user = await userModel.findById(checkUser.userId).populate('wishlist');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch or create wishlist
        let wishlist = await Wishlist.findById(user.wishlist);

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: user._id,
                items: [],
            });
        }

        const alreadyExists = wishlist.items.includes(productId);

        if (alreadyExists) {
            return res.status(400).json({ message: "Product already in wishlist" });
        }

        wishlist.items.push(productId);
        await wishlist.save();


        if (!user.wishlist) {
            user.wishlist = wishlist._id;
            await user.save();
        }

        res.status(200).json({ message: "Product added to wishlist", wishlist: wishlist.items });

    } catch (error) {
        console.error("Error adding product to wishlist:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

router.get('/all', isLogged, async (req, res) => {
    try {
        const checkUser = req.user;

        // Find the user with populated wishlist
        const user = await userModel.findById(checkUser.userId);

        if (!user || !user.wishlist) {
            return res.status(404).json({ message: "Wishlist not found" });
        }

        // Fetch wishlist and populate product details
        const wishlist = await Wishlist.findById(user.wishlist).populate({
            path: 'items',
            populate: [
                {
                    path: 'category',
                    select: 'title'
                },
                {
                    path: 'inventory',
                    select: 'quantityInStock'
                }
            ]
        });


        if (!wishlist) {
            return res.status(404).json({ message: "Wishlist not found" });
        }

        res.status(200).json({ wishlist: wishlist.items });

    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

router.post('/remove', isLogged, async (req, res) => {
    try {
        const checkUser = req.user;
        const { productId } = req.body;

        // Find the user
        const user = await userModel.findById(checkUser.userId).populate('wishlist');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find wishlist
        const wishlist = await Wishlist.findById(user.wishlist);

        if (!wishlist) {
            return res.status(404).json({ message: "Wishlist not found" });
        }

        // Check if product exists in wishlist
        const index = wishlist.items.indexOf(productId);
        if (index === -1) {
            return res.status(404).json({ message: "Product not in wishlist" });
        }

        // Remove product
        wishlist.items.splice(index, 1);
        await wishlist.save();

        res.status(200).json({ message: "Product removed from wishlist", wishlist: wishlist.items });

    } catch (error) {
        console.error("Error removing product from wishlist:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


module.exports = router;
