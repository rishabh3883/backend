const mongoose = require('mongoose');

const EmissionsSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
    date: { type: Date, default: Date.now },
    co2Amount: { type: Number, required: true }, // kg CO2e
    sourceType: { type: String, enum: ['Waste', 'Energy'] }
});

module.exports = mongoose.model('Emissions', EmissionsSchema);
