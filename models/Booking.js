const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    paymentId: { type: String, required: true }, // Mock Payment ID from Frontend
    status: { type: String, enum: ['Confirmed', 'Cancelled'], default: 'Confirmed' },
    qrCode: { type: String, required: true } // Unique token for the pass
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
