const mongoose = require('mongoose');

const WasteRecordSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
    date: { type: Date, default: Date.now },
    category: { type: String, required: true, enum: ['Plastic', 'Paper', 'Food', 'Metal', 'Glass', 'Other'] },
    amount: { type: Number, required: true }, // in kg
    processing: { type: String, enum: ['Recycled', 'Composted', 'Landfill'] }
});

module.exports = mongoose.model('WasteRecord', WasteRecordSchema);
