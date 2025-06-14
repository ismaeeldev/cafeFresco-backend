const mongoose = require('mongoose');

const financeSchema = mongoose.Schema({
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    linkedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'order' },
    linkedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'employee' },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('finance', financeSchema);
