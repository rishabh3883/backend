const mongoose = require('mongoose');

const HostelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    warden: { type: String }
});

module.exports = mongoose.model('Hostel', HostelSchema);
