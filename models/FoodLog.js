const mongoose = require('mongoose');

const FoodLogSchema = new mongoose.Schema({
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    date: { type: Date, required: true },
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'], required: true },
    items: [{
        name: { type: String, required: true },
        quantity: { type: Number, required: true }, // kg
        unit: { type: String, default: 'kg' }
    }],
    quantities: {
        prepared: { type: Number, required: true }, // kg
        served: { type: Number, required: true }, // kg
        leftover: { type: Number, default: 0 } // kg (Calculated)
    },
    timings: {
        cookedAt: { type: Date, required: true },
        storedAt: { type: Date, required: true }
    },
    safetyStatus: { type: String, enum: ['Safe', 'Unsafe'], default: 'Safe' },
    edibility: { type: String, enum: ['Edible', 'Non-Edible'], required: true },
    action: { type: String, enum: ['Pending', 'Donated', 'Composted', 'Discarded'], default: 'Pending' },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FoodLog', FoodLogSchema);
