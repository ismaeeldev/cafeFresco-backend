const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');



// Define User Schema
const userSchema = mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true,
    },
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
    image: {
        type: String,
        default: "",
    },
    address: {
        type: String,
        default: "",
    },
    phone: {
        type: String,
        default: "",
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cart',
    },
    wishlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'wishlist',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});




// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


// Export the User Model
module.exports = mongoose.model('user', userSchema); 
