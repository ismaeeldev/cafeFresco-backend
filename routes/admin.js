const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const adminModal = require('../models/admin');
const validator = require('validator');
const loginLimiter = require('../middleware/loginLimiter');
const { isAdmin, authorizeRoles } = require('../middleware/isAdmin');
require('dotenv').config();
const nodemailer = require("nodemailer");
const SECRET_KEY = process.env.SECRET_KEY;
const crypto = require('crypto');
const notifyModel = require('../models/notification')

// ✅ Register Route
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({ message: "Email, password, and name are required" });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }
        if (password.length < 5) {
            return res.status(400).json({ message: "Password must be at least 5 characters long" });
        }

        // Check if email already exists
        const checkAdmin = await adminModal.findOne({ email });
        if (checkAdmin) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin user
        const newAdmin = await adminModal.create({
            name,
            email,
            password: hashedPassword,
        });

        const token = jwt.sign(
            { userId: newAdmin._id, name: newAdmin.name, role: newAdmin.role },
            SECRET_KEY,
            { expiresIn: '15d' }
        );

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        });

        return res.status(201).json({
            message: 'Admin registered successfully!',
            admin: { name: newAdmin.name, role: newAdmin.role, email: newAdmin.email },
            token
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ✅ Login Route
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Find admin in database
        const checkAdmin = await adminModal.findOne({ email });
        if (!checkAdmin) {
            return res.status(400).json({ message: "Email not found" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, checkAdmin.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign(
            { userId: checkAdmin._id, name: checkAdmin.name, role: checkAdmin.role },
            SECRET_KEY,
            { expiresIn: '15d' }
        );

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        });

        res.status(200).json({ message: "Login successful", admin: { name: checkAdmin.name, role: checkAdmin.role }, token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


router.post('/create-permission', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if the email already exists
        const existingAdmin = await adminModal.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with this email already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin
        const newAdmin = new adminModal({ name, email, password: hashedPassword, role });
        await newAdmin.save();

        const notify = new notifyModel({
            name: req.admin.name,
            message: `${req.admin.name}  granted ${role} to ${email}`,
            type: 'permission',
        })

        await notify.save();

        res.status(201).json({ message: `New ${role} added successfully!`, admin: newAdmin });
    } catch (error) {
        res.status(500).json({ message: "Error adding admin", error });
    }
});


router.post('/update-permission', isAdmin, authorizeRoles('admin'), async (req, res) => {
    try {
        const { email, role } = req.body;

        // Basic validation
        if (!email || !role) {
            return res.status(400).json({ message: 'Email and role are required.' });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase();

        // Find admin by email
        const adminUser = await adminModal.findOne({ email: normalizedEmail });
        if (!adminUser) {
            return res.status(404).json({ message: 'Admin with this email does not exist.' });
        }

        // Prevent unnecessary update
        if (adminUser.role === role) {
            return res.status(200).json({ message: `Role is already set to '${role}'.` });
        }

        // Update role
        adminUser.role = role;
        await adminUser.save();

        const notify = new notifyModel({
            name: req.admin.name,
            message: `${req.admin.name} updated ${email}'s permission to ${role}.`,
            type: 'permission'
        })
        await notify.save();

        res.status(200).json({ message: 'Permission updated successfully.', updatedRole: adminUser.role });
    } catch (error) {
        console.error('Error updating permission:', error);
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
});

router.delete("/delete-permission", isAdmin, authorizeRoles('admin'), async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the admin exists
        const admin = await adminModal.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: 'Admin with this email not found.' });
        }

        if (admin.isRoot) {
            return res.status(403).json({ message: 'Cannot delete a root admin.' });
        }

        // Delete the admin by ID
        await adminModal.findByIdAndDelete(admin._id);
        const notify = new notifyModel({
            name: req.admin.name,
            message: `${req.admin.name} removed permission from ${email}.`,
            type: 'permission',
        });

        await notify.save();

        res.status(200).json({ message: 'Admin permission successfully deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting permission.', error });
    }
});


router.get("/all", isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const admins = await adminModal.find().select("-password");
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: "Error fetching admins", error });
    }
});

router.delete("/delete/:id", isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (req.admin.id === id) {
            return res.status(403).json({ message: "You cannot delete your own account!" });
        }

        // Find the admin
        const adminToDelete = await adminModal.findById(id);
        if (!adminToDelete) {
            return res.status(404).json({ message: "Admin not found!" });
        }

        // Delete the admin
        await adminModal.findByIdAndDelete(id);
        res.status(200).json({ message: "Admin deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting admin", error });
    }
});


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        // user: process.env.EMAIL, 
        // pass: process.env.EMAIL_PASSWORD,

        user: 'mi0364919@gmail.com',
        pass: 'ukfzzamtlmhxjzwu'

    },
});

router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const admin = await adminModal.findOne({ email });

        if (!admin) return res.status(404).json({ message: "Admin not found" });

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");
        admin.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        admin.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiration
        await admin.save();

        // Send email
        const resetUrl = `${process.env.EMAIL_RESET_URL}/admin/reset-password/${resetToken}`;
        const mailOptions = {
            to: admin.email,
            from: process.env.EMAIL,
            subject: "Password Reset Request",
            html: `<h3>Password Reset Request</h3>
                   <p>Click the link below to reset your password:</p>
                   <a href="${resetUrl}">${resetUrl}</a>
                   <p>This link will expire in 10 minutes.</p>`,
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "Password reset email sent!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        // Hash token
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Find user with the token
        const admin = await adminModal.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!admin) return res.status(400).json({ message: "Invalid or expired token" });

        // Update password
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpires = undefined;
        await admin.save();

        res.json({ message: "Password reset successful!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get('/logout', (req, res) => {
    res.clearCookie('adminToken', { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/notify', async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const notifications = await notifyModel.find({
        time: { $gte: startOfDay },
        seen: false,
    }).sort({ time: -1 });

    res.json(notifications);
});

router.post('/mark-seen', async (req, res) => {
    try {
        const result = await notifyModel.updateMany({ seen: false }, { seen: true });

        if (result.modifiedCount === 0) {
            return res.status(200).json({ message: 'No unseen notifications to update.' });
        }

        res.status(200).json({
            message: 'All notifications marked as seen',
            updatedCount: result.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});






module.exports = router;
