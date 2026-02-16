const mongoose = require('mongoose');

const BuildingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true }, // Academic, Residential, etc.
    location: {
        lat: Number,
        lng: Number
    },
    occupancy: { type: Number, default: 0 },
    metrics: {
        dailyEnergy: { type: Number, default: 0 },
        dailyWaste: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model('Building', BuildingSchema);
