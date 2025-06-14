const mongoose = require('mongoose');

// Define Payment Schema
const paymentSchema = mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Debit Card', 'COD'],
        required: true
    },
    transactionId: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
        default: 'Pending',
    },
    amount: {
        type: Number,
        required: true
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

module.exports = mongoose.model('payment', paymentSchema);
