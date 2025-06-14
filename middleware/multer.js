const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const category = require('../models/category');

// Ensure upload directories exist
const productImageDir = path.join(__dirname, '../public/images/product');
const userImageDir = path.join(__dirname, '../public/images/user');
const categoryImageDir = path.join(__dirname, '../public/images/category');

[productImageDir, userImageDir, categoryImageDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Function to set storage destination dynamically
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder;
        if (req.uploadType === 'product') {
            folder = productImageDir;
        } else if (req.uploadType === 'category') {
            folder = categoryImageDir;
        } else {
            folder = userImageDir;
        }
        cb(null, folder);
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12, (err, bytes) => {
            if (err) return cb(err, null);
            const uniqueFileName = bytes.toString('hex') + path.extname(file.originalname);
            cb(null, uniqueFileName);
        });
    }
});

// File filter (only allow images)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const isValidType = allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype);

    if (isValidType) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed (jpeg, jpg, png, gif)"), false);
    }
};

// Multer upload function
const upload = (type) => {
    return (req, res, next) => {
        req.uploadType = type; // Set type dynamically for destination folderh
        multer({
            storage: storage,
            limits: { fileSize: 1 * 1024 * 1024 }, // 5MB limit
            fileFilter: fileFilter
        }).single('image')(req, res, (err) => {
            if (err) {
                return res.status(400).json({ message: err.message });
            }
            next();
        });
    };
};

module.exports = upload;
