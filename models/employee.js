const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cnic: { type: Number, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    position: { type: String },
    salary: { type: Number },
    hireDate: { type: Date, default: Date.now },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'department'
    },
    address: {
        type: String,
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('employee', employeeSchema);
