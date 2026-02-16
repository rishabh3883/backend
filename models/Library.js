const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    totalSeats: { type: Number, required: true },
    bookedSeats: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Library', librarySchema);
