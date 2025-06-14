const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true,
    },
    quantityInStock: {
        type: Number,
        required: true,
        default: 0,
    },
    restockDate: {
        type: Date,
        default: null,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

module.exports = mongoose.model('inventory', inventorySchema);
