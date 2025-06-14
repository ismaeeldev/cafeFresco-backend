const express = require('express');
const router = express.Router();
const Distributor = require('../models/distributer');
const { authorizeRoles, isAdmin } = require('../middleware/isAdmin');

// Create a distributor
router.post('/create', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const distributor = new Distributor(req.body);
        const saved = await distributor.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update a distributor
router.put('/update/:id', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const updated = await Distributor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: "Distributor not found" });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a distributor
router.delete('/delete/:id', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const deleted = await Distributor.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: "Distributor not found" });
        res.json({ message: "Distributor deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch with filters
router.get('/', isAdmin, authorizeRoles("admin", "editor", "manager"),
    async (req, res) => {
        try {
            const { supplyCategory, name, isActive } = req.query;

            let filter = {};


            if (supplyCategory) {
                filter.supplyCategories = { $in: [supplyCategory] };
            }

            if (name) {
                filter.name = { $regex: name, $options: 'i' };
            }

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true';
            }

            const distributors = await Distributor.find(filter);
            res.json({ distributors });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);



module.exports = router;
