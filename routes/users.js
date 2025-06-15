const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModal = require('../models/user');
const validator = require('validator');
const loginLimiter = require('../middleware/loginLimiter')
const isLogged = require('../middleware/isLogged')
const upload = require('../middleware/multer')
const nodemailer = require("nodemailer");
const crypto = require('crypto');
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;
const vpnDetect = require('../middleware/vpnDetect')
const { isAdmin, authorizeRoles } = require('../middleware/isAdmin');




// Register route
router.post('/register', vpnDetect, async (req, res) => {
    try {
        const { name, email, password, address, phone } = req.body;

        // Validate required fields
        if (!email || !password || !name) {
            return res.status(400).json({ message: "Email, password, and name are required" });
        }

        // Validate email format and password length
        if (email.length < 3) {
            return res.status(400).json({ message: "Email must be at least 3 characters long" });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }
        if (password.length < 5) {
            return res.status(400).json({ message: "Password must be at least 5 characters long" });
        }

        // Check if email already exists
        const checkUser = await userModal.findOne({ email });
        if (checkUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        // Create the new user
        const newUser = await userModal.create({
            name,
            email,
            password: hashedPassword,
            address: address || "",
            phone: phone || "",
        });

        // Generate JWT token
        const token = jwt.sign({ email: newUser.email, userId: newUser._id }, process.env.SECRET_KEY, { expiresIn: '15d' });

        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 15 * 24 * 60 * 60 * 1000
        });


        return res.status(201).json({
            message: 'User registered successfully!',
            user: { name: newUser.name, email: newUser.email },
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Login route
router.post('/login', loginLimiter, vpnDetect, async (req, res) => {

    try {
        const { email, password } = req.body;

        // Check if the user exists
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }


        const checkUser = await userModal.findOne({ email });
        if (!checkUser) {
            return res.status(400).json({ message: "Email not found" });
        }


        // Compare the hashed password
        const isMatch = await bcrypt.compare(password.trim(), checkUser.password)

        if (!isMatch) {

            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { email: checkUser.email, userId: checkUser._id }, process.env.SECRET_KEY, { expiresIn: '15d' }
        );

        // Set the token in a cookie
        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 15 * 24 * 60 * 60 * 1000
        });



        // Send token in response for convenience
        res.status(200).json({ message: "Login successful", token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.clearCookie('token'); // Clear the token cookie
    res.status(200).json({ message: "Logout successful" });
});

//Update-Profile
router.put('/update-profile', isLogged, async (req, res) => {
    try {
        const { name, email, address, phone } = req.body;

        if (name && name.length < 3) {
            return res.status(400).json({ message: "Name must be at least 3 characters long" });
        }

        if (email && !validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Update user profile
        const user = await userModal.findByIdAndUpdate(
            req.user.userId,
            { name, email, address, phone },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const updatedUser = {
            name: user.name,
            email: user.email,
            address: user.address,
            phone: user.phone
        };

        res.status(200).json({
            user: updatedUser,
            message: "User profile updated successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post('/upload-image', upload('user'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image is required" });
        }

        const imagePath = `/images/user/${req.file.filename}`;

        // Update user profile (assuming user ID is in req.user.id)
        await User.findByIdAndUpdate(req.user.id, { avatar: imagePath });

        res.status(200).json({ message: "Profile picture updated", avatar: imagePath });

    } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
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
        if (!email) return res.status(400).json({ message: "Email is required." });

        const user = await userModal.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");
        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiration
        await user.save();

        // Send email
        const resetUrl = `${process.env.EMAIL_USER_URL}/user/reset-password/${resetToken}`;
        const mailOptions = {
            to: user.email,
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
        const user = await userModal.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        // Update password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: "Password reset successful!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/all', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const users = await userModal.find().skip(skip).limit(limit);
        const totalUsers = await userModal.countDocuments();

        res.status(200).json({
            success: true,
            data: users,
            totalUsers,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit)
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// backend route: /user/search?query=...
router.get('/search', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ message: 'Missing search query' });
    }

    try {
        const mongoose = require("mongoose");
        const isValidObjectId = mongoose.Types.ObjectId.isValid(query);

        let searchConditions = [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } }
        ];

        if (isValidObjectId) {
            searchConditions.push({ _id: query });
        }

        const users = await userModal.find({ $or: searchConditions });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(users);
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.post('/contact', async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !phone || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {

        const mailOptions = {
            from: email,
            to: 'mi0364922@gmail.com',
            subject: `New Contact Form: ${subject}`,
            html: `
        <h3>Contact Details</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `,
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Message sent successfully!' });
    } catch (err) {
        console.error('Error sending mail:', err);
        res.status(500).json({ message: 'Failed to send email.' });
    }
});



router.use('/images/user', express.static('public/images/user'));
module.exports = router;
