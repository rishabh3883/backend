const mongoose = require('mongoose');

const LibraryStatusSchema = new mongoose.Schema({
    totalSeats: { type: Number, default: 100 },
    occupiedSeats: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LibraryStatus', LibraryStatusSchema);
