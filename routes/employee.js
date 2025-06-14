const { authorizeRoles, isAdmin } = require('../middleware/isAdmin');
const employeeModel = require('../models/employee');
const departmentModel = require('../models/department');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')

router.post('/register', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const employeeData = req.body;

        if (!employeeData || !employeeData.cnic || !employeeData.department) {
            return res.status(400).json({ message: "Missing required fields: CNIC or Department." });
        }

        // Validate department ObjectId
        if (!mongoose.Types.ObjectId.isValid(employeeData.department)) {
            return res.status(400).json({ message: "Invalid Department ID." });
        }

        // Check if department exists
        const departmentExists = await departmentModel.findById(employeeData.department);
        if (!departmentExists) {
            return res.status(404).json({ message: "Department not found." });
        }

        // Check if CNIC already exists
        const existingEmployee = await employeeModel.findOne({ cnic: employeeData.cnic });
        if (existingEmployee) {
            return res.status(409).json({ message: "CNIC already registered." });
        }

        // Create new employee
        const newEmployee = new employeeModel(employeeData);
        const savedEmployee = await newEmployee.save();

        res.status(201).json({ message: "Employee registered successfully", employee: savedEmployee });
    } catch (error) {
        console.error("Error registering employee:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

router.post('/update/:id', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeData } = req.body;

        // Basic validations
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid employee ID." });
        }

        if (!employeeData || !employeeData.cnic) {
            return res.status(400).json({ message: "Invalid data. CNIC is required." });
        }

        // Validate department if present
        if (employeeData.department) {
            if (!mongoose.Types.ObjectId.isValid(employeeData.department)) {
                return res.status(400).json({ message: "Invalid department ID." });
            }

            const departmentExists = await departmentModel.findById(employeeData.department);
            if (!departmentExists) {
                return res.status(404).json({ message: "Department not found." });
            }
        }

        const existing = await employeeModel.findOne({ cnic: employeeData.cnic, _id: { $ne: id } });
        if (existing) {
            return res.status(409).json({ message: "CNIC already in use by another employee." });
        }

        // Update employee
        const updatedEmployee = await employeeModel.findByIdAndUpdate(id, employeeData, { new: true });
        if (!updatedEmployee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        res.status(200).json({ message: "Employee data successfully updated", employee: updatedEmployee });
    } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

router.delete('/delete/:id', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;

        const deletedEmployee = await employeeModel.findByIdAndDelete(id);
        if (!deletedEmployee) {
            return res.status(404).json({ message: "Employee does not exist" });
        }

        return res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
        console.error("Error deleting employee:", error);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
});

router.get('/fetch', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const { page = 1, limit = 10, cnic, department } = req.query;

        const query = {};

        if (cnic) {
            query.cnic = { $regex: cnic, $options: 'i' };
        }

        if (department) {
            query.department = department;
        }

        const totalEmployees = await employeeModel.countDocuments(query);

        const employees = await employeeModel
            .find(query)
            .populate('department', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            total: totalEmployees,
            page: parseInt(page),
            limit: parseInt(limit),
            employees
        });

    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;