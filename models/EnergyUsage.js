const mongoose = require('mongoose');

const EnergyUsageSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
    date: { type: Date, default: Date.now },
    source: { type: String, enum: ['Grid', 'Solar', 'Gas', 'Biomass'] },
    amount: { type: Number, required: true } // in kWh
});

module.exports = mongoose.model('EnergyUsage', EnergyUsageSchema);
