const express = require('express');
const router = express.Router();
const departmentModel = require('../models/department');
const { authorizeRoles, isAdmin } = require('../middleware/isAdmin');

router.post('/add', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const data = req.body;

        if (!data || !data.name) {
            return res.status(400).json({ message: "Department name is required." });
        }

        const existing = await departmentModel.findOne({ name: data.name.trim() });
        if (existing) {
            return res.status(409).json({ message: "Department already exists." });
        }

        const newDep = new departmentModel(data);
        const savedDep = await newDep.save();

        return res.status(201).json({ message: "Successfully added department", department: savedDep });
    } catch (error) {
        console.error("Error adding department:", error);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
});

router.put('/update/:id', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (!data || !data.name) {
            return res.status(400).json({ message: "Department name is required." });
        }

        const existing = await departmentModel.findOne({ name: data.name.trim(), _id: { $ne: id } });
        if (existing) {
            return res.status(409).json({ message: "Another department with this name already exists." });
        }

        const updated = await departmentModel.findByIdAndUpdate(id, data, { new: true });

        if (!updated) {
            return res.status(404).json({ message: "Department not found." });
        }

        return res.status(200).json({ message: "Department updated successfully", department: updated });
    } catch (error) {
        console.error("Error updating department:", error);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
});

router.delete('/delete/:id', isAdmin, authorizeRoles("admin", "manager"), async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await departmentModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Department not found." });
        }

        return res.status(200).json({ message: "Department deleted successfully." });
    } catch (error) {
        console.error("Error deleting department:", error);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
});

router.get('/fetch', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const departments = await departmentModel.find().sort({ createdAt: -1 });
        return res.status(200).json({ departments });
    } catch (error) {
        console.error("Error fetching departments:", error);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router


