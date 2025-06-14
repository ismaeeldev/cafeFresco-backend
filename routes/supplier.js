const express = require('express');
const router = express.Router();
const Supplier = require('../models/supplier');
const { authorizeRoles, isAdmin } = require('../middleware/isAdmin');

// Create supplier
router.post('/create', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const supplier = new Supplier(req.body);
        const saved = await supplier.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update supplier
router.put('/update/:id', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const updated = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Supplier not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete supplier
router.delete('/delete/:id', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const deleted = await Supplier.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ message: 'Supplier deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const { distributor, supplies, isActive } = req.query;

        let filter = {};

        if (distributor) {
            filter.distributor = distributor;
        }

        if (supplies) {
            filter.supplies = supplies;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const suppliers = await Supplier.find(filter).populate('distributor');
        res.json({ suppliers }); // ✅ Return in expected format

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
