const WasteRecord = require('../models/WasteRecord');
const EnergyUsage = require('../models/EnergyUsage');
const Emissions = require('../models/Emissions');

// Get high-level Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Total Waste
        const wasteData = await WasteRecord.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalWaste = wasteData[0]?.total || 0;

        // 2. Total Energy
        const energyData = await EnergyUsage.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalEnergy = energyData[0]?.total || 0;

        // 3. Sustainability Score Calculation (Simplified logic)
        // Base 50, +points for low emissions, -points for high waste
        // This is a mock formula for the hackathon
        let score = 75;
        if (totalWaste > 1000) score -= 5;
        if (totalEnergy > 5000) score -= 5;
        if (score < 0) score = 0;
        if (score > 100) score = 100;

        res.json({
            totalWaste,
            totalEnergy,
            sustainabilityScore: score,
            totalEmissions: 1200 // Mock for now or aggregate similarly
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
