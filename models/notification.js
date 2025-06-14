const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    name: { type: String },
    message: { type: String, required: true },
    type: { type: String, enum: ['order', 'permission'], required: true },
    time: { type: Date, default: Date.now },
    seen: { type: Boolean, default: false }
});

module.exports = mongoose.model('notification', notificationSchema);
