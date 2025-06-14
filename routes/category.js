const express = require('express');
const router = express.Router();
const categoryModal = require('../models/category')
const { isAdmin, authorizeRoles } = require('../middleware/isAdmin')
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/multer')



router.post("/add", upload('category'), isAdmin, authorizeRoles("editor", "manager", "admin"), async (req, res) => {
    console.log(`Route: req.uploadType = ${req.uploadType}, req.file = ${JSON.stringify(req.file)}`); // Debug
    const { title, description } = req.body;

    // Validate title
    if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Title is required" });
    }

    try {
        const existingCategory = await categoryModal.findOne({ title: title.trim() });
        if (existingCategory) {
            return res.status(400).json({ message: "Category already exists" });
        }

        // Handle image
        let imagePath = "";
        if (req.file) {
            imagePath = `/images/category/${req.file.filename}`;
        } else {
            console.warn("⚠️ No category image uploaded.");
        }

        // Create new category
        const newCategory = new categoryModal({
            title: title.trim(),
            image: imagePath,
            description: description,
        });

        await newCategory.save();

        res.status(201).json({
            message: "Category created successfully",
            category: newCategory,
        });
    } catch (err) {
        console.error("❌ Error creating category:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}
);

router.put(
    '/update/:id',
    upload('category'),
    isAdmin,
    authorizeRoles('editor', 'manager', 'admin'),
    async (req, res) => {
        try {
            const { title, description } = req.body;
            const { id } = req.params;

            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid category ID' });
            }

            if (!title && !description && !req.file) {
                return res.status(400).json({ message: 'At least one field is required' });
            }

            const existingCategory = await categoryModal.findById(id);
            if (!existingCategory) {
                // If file is uploaded but category not found, clean it up
                if (req.file) await fs.unlink(req.file.path).catch(() => { });
                return res.status(404).json({ message: 'Category not found' });
            }

            const updateData = {};
            if (title) updateData.title = title.trim();
            if (description) updateData.description = description.trim();

            // Handle image update
            if (req.file) {
                const newImagePath = `/images/category/${req.file.filename}`;

                // Delete old image
                if (existingCategory.image) {
                    const oldImagePath = path.join(__dirname, '..', 'public', existingCategory.image.replace(/^\/+/, ''));
                    try {
                        fs.unlink(oldImagePath, (err) => {
                            if (err && err.code !== 'ENOENT') {
                                console.error(`Error deleting old image: ${oldImagePath}`, err);
                            } else {
                                console.log(`Deleted old image: ${oldImagePath}`);
                            }
                        });
                        console.log(`Deleted old image: ${oldImagePath}`);
                    } catch (err) {
                        if (err.code !== 'ENOENT') {
                            console.error(`Error deleting old image: ${oldImagePath}`, err);
                        }
                    }
                }

                updateData.image = newImagePath;
            }

            const updatedCategory = await categoryModal.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true,
            });

            return res.status(200).json({
                message: 'Category updated successfully',
                category: updatedCategory,
            });
        } catch (error) {
            // Cleanup uploaded file on error
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => { });
            }
            console.error('Error updating category:', error);
            res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }
);


router.delete('/delete/:id', isAdmin, authorizeRoles("manager", "admin"), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }

        // Find the category to get the image path
        const category = await categoryModal.findById(id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Delete the category from the database
        await categoryModal.findOneAndDelete({ _id: id });

        // Delete the associated image file, if it exists
        if (category.image) {
            const imagePath = path.join(__dirname, '../public', category.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.status(200).json({ message: "Category and associated image deleted successfully" });

    } catch (err) {
        console.error("Error in deleting category:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
});


router.get('/fetch', async (req, res) => {
    try {
        const categories = await categoryModal.find();

        res.status(200).json({ message: "Categories fetched successfully", categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoryModal.findById(id);

        if (!category) {
            return res.status(404).json({ message: "category not found" });
        }

        res.status(200).json(category);
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

module.exports = router;

