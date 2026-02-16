const Alert = require('../models/Alert');

exports.getAlerts = async (req, res) => {
    try {
        // If admin, show all. If others, maybe partial (but requirements say Admin mostly)
        const alerts = await Alert.find().populate('hostelId').sort({ timestamp: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
