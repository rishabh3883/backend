const mongoose = require('mongoose');

const ResourceUsageSchema = new mongoose.Schema({
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    date: { type: Date, required: true },
    water: { type: Number, default: 0 }, // Liters
    electricity: { type: Number, default: 0 }, // kWh
    foodWaste: { type: Number, default: 0 }, // kg
    sourceFile: { type: String }, // For tracking Excel uploads
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
});

module.exports = mongoose.model('ResourceUsage', ResourceUsageSchema);
