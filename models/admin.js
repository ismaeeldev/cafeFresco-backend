const mongoose = require('mongoose');

const adminSchema = mongoose.Schema({
    name: String,
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "editor", "manager"],
        default: "admin"
    },
    isRoot: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
})

module.exports = mongoose.model('admin', adminSchema)