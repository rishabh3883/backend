const mongoose = require('mongoose');

const libraryBookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    library: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
    status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date }
}, { timestamps: true });

// Prevent multiple active bookings for the same user
libraryBookingSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'Active' } });

module.exports = mongoose.model('LibraryBooking', libraryBookingSchema);
