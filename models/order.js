const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        quantity: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    orderStatus: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'payment',
        default: null,
    }
}, { timestamps: true });

module.exports = mongoose.model('order', orderSchema);
