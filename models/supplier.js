const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
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
    supplies: [{
        type: String,
        enum: ['vegetables', 'meat', 'dairy', 'beverages', 'bakery', 'other']
    }],
    distributor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'distributor',
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('supplier', supplierSchema);
