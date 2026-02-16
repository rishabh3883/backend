const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    venue: { type: String, required: true },
    price: { type: Number, required: true },
    totalSeats: { type: Number, required: true },
    bookedSeats: { type: Number, default: 0 },
    rules: { type: [String], default: [] },
    organizer: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
