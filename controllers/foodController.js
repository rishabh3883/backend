const FoodLog = require('../models/FoodLog');
const Hostel = require('../models/Hostel');
const Alert = require('../models/Alert');

// SAFETY RULES
const MAX_SAFE_TIME_MS = 4 * 60 * 60 * 1000; // 4 Hours
const ANOMALY_THRESHOLD = 0.2; // 20% Leftover vs Prepared

exports.submitLog = async (req, res) => {
    try {
        const { hostelId, date, mealType, items, quantities, timings, edibility } = req.body;

        // 1. Calculate Leftover
        const leftover = quantities.prepared - quantities.served;
        if (leftover < 0) return res.status(400).json({ message: "Served cannot exceed Prepared" });

        // 2. Safety Validation (Time-based Anomaly)
        const cooked = new Date(timings.cookedAt);
        const stored = new Date(timings.storedAt);
        const duration = stored - cooked;

        let safetyStatus = 'Safe';
        let act = 'Pending';

        if (duration > MAX_SAFE_TIME_MS) {
            safetyStatus = 'Unsafe';
            // TRIGGER SPOILAGE ALARM
            await Alert.create({
                hostelId,
                type: 'Food Safety Violation',
                severity: 'High',
                message: `SPOILAGE RISK: ${mealType} food was stored after ${(duration / 3600000).toFixed(1)} hours. Max allowed is 4 hours.`,
                status: 'Open'
            });
        }

        // 3. Data Anomaly Check (Excessive Wastage)
        if (leftover > (quantities.prepared * ANOMALY_THRESHOLD)) {
            await Alert.create({
                hostelId,
                type: 'High Food Wastage',
                severity: 'Medium',
                message: `ANOMALY: ${mealType} had ${(leftover / quantities.prepared * 100).toFixed(1)}% wastage (${leftover}kg).`,
                status: 'Open'
            });
        }

        // 4. Create Log
        const log = new FoodLog({
            hostelId,
            date,
            mealType,
            items,
            quantities: { ...quantities, leftover },
            timings,
            safetyStatus,
            edibility,
            action: act,
            loggedBy: req.user._id
        });

        await log.save();
        res.status(201).json(log);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const logs = await FoodLog.find().populate('hostelId').sort({ date: -1, createdAt: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // Donated, Composted, Discarded

        const log = await FoodLog.findById(id);
        if (!log) return res.status(404).json({ message: "Log not found" });

        // RULE: Cannot Donate if Unsafe or Non-Edible
        if (action === 'Donated') {
            if (log.safetyStatus === 'Unsafe' || log.edibility === 'Non-Edible') {
                // TRIGGER UNAUTHORIZED ACTION ALARM
                await Alert.create({
                    hostelId: log.hostelId,
                    type: 'Unauthorized Donation Attempt',
                    severity: 'High',
                    message: `SECURITY: User ${req.user.name} tried to donate UNSAFE/NON-EDIBLE food (${log.mealType}). Action Blocked.`,
                    status: 'Open'
                });
                return res.status(403).json({ message: "Safety Violation: Cannot donate unsafe food." });
            }
        }

        log.action = action;
        await log.save();
        res.json(log);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
