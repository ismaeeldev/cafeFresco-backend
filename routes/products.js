const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Category = require('../models/category')
const Inventory = require('../models/inventory')
const upload = require('../middleware/multer')
const { isAdmin, authorizeRoles } = require('../middleware/isAdmin')
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');



// ✅ Add a new product
router.post('/add', upload('product'), isAdmin, authorizeRoles("editor", "manager", "admin"), async (req, res) => {
    try {
        const { title, description, price, discount, category, featured, newRelease, stock } = req.body;

        // Validate required fields
        if (!title || !description || !price) {
            return res.status(400).json({ message: "Title, description, and price are required" });
        }

        // Validate category existence
        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
            return res.status(404).json({ message: "Category not found" });
        }

        let imagePath = "";
        if (req.file) {
            imagePath = `/images/product/${req.file.filename}`;
        } else {
            console.log("No file uploaded");
        }


        // Create product
        const newProduct = new Product({
            title,
            image: imagePath,
            description,
            price,
            discount,
            category,
            featured,
            newRelease,
        });

        const savedProduct = await newProduct.save();

        const newInventory = new Inventory({
            productId: savedProduct._id,
            quantityInStock: stock,
        });

        await newInventory.save();

        savedProduct.inventory = newInventory._id;
        await savedProduct.save();

        res.status(201).json({ message: "Product added successfully", product: savedProduct });

    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// ✅ Update a product
router.put('/update/:id', upload('product'), isAdmin, authorizeRoles("editor", "manager", "admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Find the existing product
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (req.file) {
            const oldImagePath = path.join(__dirname, '../public/images/product', existingProduct.image);

            // Check if the old image exists and delete it
            if (existingProduct.image && fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }

            // Update the image field with the new filename
            updates.image = `/images/product/${req.file.filename}`;
        }

        // If the stock is updated, update the inventory too
        if (updates.stock) {
            const inventory = await Inventory.findOne({ productId: existingProduct._id });

            // If inventory exists, update the quantityInStock
            if (inventory) {
                inventory.quantityInStock = updates.stock;
                await inventory.save();
            } else {
                // If inventory does not exist, create a new one
                const newInventory = new Inventory({
                    productId: existingProduct._id,
                    quantityInStock: updates.stock,
                });
                await newInventory.save();
            }
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });

        res.status(200).json({ message: "Product updated successfully", product: updatedProduct });

    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// ✅ Delete a product
router.delete('/delete/:id', isAdmin, authorizeRoles("manager", "admin"), async (req, res) => {
    try {
        const { id } = req.params;

        // Find the product
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Delete associated inventory
        await Inventory.findOneAndDelete({ productId: id });

        // Delete associated image file
        if (deletedProduct.image) {
            const imagePath = path.join(__dirname, '../public', deletedProduct.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.status(200).json({ message: "Product and related inventory deleted successfully" });

    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});
// ✅ Get all products
router.get('/all', async (req, res) => {
    try {
        const products = await Product.find().populate('category', 'title');
        res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


router.get('/new-releases', async (req, res) => {
    try {
        const newReleasedProducts = await Product.aggregate([
            { $match: { newRelease: true } },
            { $sample: { size: 8 } } // Randomly select 6
        ]);

        // If you want to populate category as in your previous route:
        const populatedProducts = await Product.populate(newReleasedProducts, {
            path: 'category',
            select: 'title'
        });

        res.status(200).json(populatedProducts);
    } catch (error) {
        console.error("Error fetching new released products:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


router.get('/featured', async (req, res) => {
    try {
        const newReleasedProducts = await Product.aggregate([
            { $match: { featured: true } },
            { $sample: { size: 8 } } // Randomly select 6
        ]);

        // If you want to populate category as in your previous route:
        const populatedProducts = await Product.populate(newReleasedProducts, {
            path: 'category',
            select: 'title'
        });

        res.status(200).json(populatedProducts);
    } catch (error) {
        console.error("Error fetching new released products:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


router.get("/fetch", async (req, res) => {
    try {
        let { category, name, sort, page = 1, limit = 10 } = req.query;

        // Convert page & limit to numbers with validation
        page = Math.max(1, parseInt(page)) || 1;
        limit = Math.max(1, parseInt(limit)) || 10;

        // Build filter object
        let filter = {};
        if (category && mongoose.Types.ObjectId.isValid(category)) {
            filter.category = new mongoose.Types.ObjectId(category);
        }

        if (name) filter.title = { $regex: name, $options: "i" };

        // Create base query with single populate
        let query = Product.find(filter)
            .populate("category")
            .populate("inventory");

        // Sorting logic
        if (sort === "low") query = query.sort({ price: 1 });
        else if (sort === "high") query = query.sort({ price: -1 });

        // Count total documents before pagination
        const totalCount = await Product.countDocuments(filter);

        // Pagination logic
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);

        // Execute query
        const products = await query.exec();

        res.status(200).json({
            success: true,
            total: totalCount,
            page,
            totalPages: Math.ceil(totalCount / limit),
            products,
        });
    } catch (error) {
        console.error("Fetch Error:", error); // Better logging
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
});


// ✅ Get a single product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id).populate('category', 'title');

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

router.post('/inventory/update/:id', isAdmin, authorizeRoles("editor", "manager", "admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { quantityInStock } = req.body;

        // Validation
        if (quantityInStock === undefined || isNaN(quantityInStock)) {
            return res.status(400).json({ message: 'Invalid or missing stock quantity' });
        }

        const productInventory = await Inventory.findOne({ productId: id });

        if (!productInventory) {
            return res.status(404).json({ message: 'Product inventory not found' });
        }

        productInventory.quantityInStock = quantityInStock;
        productInventory.restockDate = new Date();

        await productInventory.save();

        return res.status(200).json({ message: 'Stock updated successfully', inventory: productInventory });
    } catch (error) {
        console.error('Inventory update error:', error);
        return res.status(500).json({ message: 'Server error while updating stock' });
    }
});





router.use('/images/product', express.static('public/images/product'));
module.exports = router;
