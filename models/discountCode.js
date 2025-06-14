const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    minPurchase: { type: Number, default: 0 },
    maxUses: { type: Number, default: 1 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }]
});

module.exports = mongoose.model('discountCode', discountCodeSchema);
