const express = require('express');
const router = express.Router();
const EnergyUsage = require('../models/EnergyUsage');

// Get all energy records
router.get('/', async (req, res) => {
    try {
        const energy = await EnergyUsage.find().populate('buildingId');
        res.json(energy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add energy record
router.post('/', async (req, res) => {
    const { buildingId, source, amount } = req.body;
    const newEnergy = new EnergyUsage({ buildingId, source, amount });
    try {
        const savedEnergy = await newEnergy.save();

        // Check for spikes (simple logic)
        if (amount > 1000) {
            const io = req.app.get('socketio');
            io.emit('new-alert', {
                message: `High Energy Usage detected: ${amount} kWh`,
                type: 'Energy Spike',
                severity: 'High',
                timestamp: new Date()
            });
        }

        res.status(201).json(savedEnergy);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
