const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    searches: [{ type: String }],
    viewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
}, { timestamps: true });

module.exports = mongoose.model('userInterest', userHistorySchema);
