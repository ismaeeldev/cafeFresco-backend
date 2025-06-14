const mongoose = require('mongoose');

const distributorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactPerson: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    address: {
        type: String
    },
    supplyCategories: [{
        type: String,
        enum: ['vegetables', 'meat', 'dairy', 'beverages', 'bakery', 'other']
    }],
    isActive: {
        type: Boolean,
        default: true
    },

}, { timestamps: true });

module.exports = mongoose.model('distributor', distributorSchema);
