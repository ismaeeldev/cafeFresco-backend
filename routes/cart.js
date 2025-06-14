const express = require('express');
const router = express.Router();
const userModel = require('../models/user');
const isLogged = require('../middleware/isLogged');
const cartModel = require('../models/cart')


//add cart 
router.post('/add', isLogged, async (req, res) => {
    try {
        const checkUser = req.user;
        const { productId, quantity } = req.body;

        const user = await userModel.findById(checkUser.userId).populate('cart');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch or create cart
        let cart = await cartModel.findById(user.cart);

        if (!cart) {
            cart = new cartModel({
                userId: user._id,
                items: [],
            });
        }

        const existingProduct = cart.items.find(item => item.productId.toString() === productId);

        if (existingProduct) {
            existingProduct.quantity += quantity;
        } else {
            cart.items.push({
                productId,
                quantity,
            });
        }

        await cart.save();

        if (!user.cart) {
            user.cart = cart._id;
            await user.save();
        }

        res.status(200).json({ message: "Product added to cart", cart: cart.items });

    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


router.get('/all', isLogged, async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await userModel.findById(userId);
        if (!user || !user.cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const cart = await cartModel.findById(user.cart)
            .populate({
                path: 'items.productId',
                select: 'name price image category title',
                populate: {
                    path: 'category',
                    select: 'title'
                }
            });

        if (!cart || cart.items.length === 0) {
            return res.status(200).json({ message: "Cart is empty", cart: [] });
        }

        const formattedCart = cart.items.map(item => ({
            productId: item.productId._id,
            name: item.productId.name,
            price: item.productId.price,
            image: item.productId.image,
            category: item.productId.category,
            title: item.productId.title,
            quantity: item.quantity
        }));

        res.status(200).json({ cart: formattedCart });

    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

router.post('/remove', isLogged, async (req, res) => {
    try {
        const checkUser = req.user;
        const { productId } = req.body;

        // Find the user and populate cart
        const user = await userModel.findById(checkUser.userId).populate('cart');

        if (!user || !user.cart) {
            return res.status(404).json({ message: "User or cart not found" });
        }

        // Find the cart document
        const cart = await cartModel.findById(user.cart);

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Filter out the product
        const initialLength = cart.items.length;
        cart.items = cart.items.filter(item => item.productId.toString() !== productId);

        if (cart.items.length === initialLength) {
            return res.status(400).json({ message: "Product not found in cart" });
        }

        await cart.save();

        res.status(200).json({ message: "Product removed from cart", cart: cart.items });

    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

router.post('/update-quantity', isLogged, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { productId, quantity } = req.body;

        // Get user's cart
        const user = await userModel.findById(userId);
        if (!user || !user.cart) {
            return res.status(404).json({ message: "Cart not found for user" });
        }

        const cart = await cartModel.findById(user.cart);
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Find item in cart
        const item = cart.items.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ message: "Product not found in cart" });
        }

        // Update quantity
        item.quantity = quantity;

        await cart.save();
        res.status(200).json({ message: "Quantity updated", cart: cart.items });

    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;