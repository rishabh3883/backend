const express = require('express');
const router = express.Router();
const WasteRecord = require('../models/WasteRecord');

// Get all waste records
router.get('/', async (req, res) => {
    try {
        const waste = await WasteRecord.find().populate('buildingId');
        res.json(waste);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add waste record
router.post('/', async (req, res) => {
    const { buildingId, category, amount, processing } = req.body;
    const newWaste = new WasteRecord({ buildingId, category, amount, processing });
    try {
        const savedWaste = await newWaste.save();
        res.status(201).json(savedWaste);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
