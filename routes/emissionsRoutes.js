const express = require('express');
const router = express.Router();
const Emissions = require('../models/Emissions');

router.get('/', async (req, res) => {
    try {
        const emissions = await Emissions.find();
        res.json(emissions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
