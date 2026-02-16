const ResourceUsage = require('../models/ResourceUsage');
const Hostel = require('../models/Hostel');
const Alert = require('../models/Alert');
const xlsx = require('xlsx');
const fs = require('fs');
const User = require('../models/User');
const FoodLog = require('../models/FoodLog');

// Helper to check for anomalies and generate Smart Analysis
const checkAndCreateAlerts = async (hostelId, currentUsage) => {
    try {
        const hostel = await Hostel.findById(hostelId);
        if (!hostel) return;

        // Get Resident Count
        const residentCount = await User.countDocuments({ hostelId, role: 'Student' });

        // Define Per-Student Baselines (Standard)
        const BASELINE = {
            water: 135, // Liters per student
            electricity: 5, // kWh per student (approx daily)
            foodWaste: 0.1 // kg per student
        };

        // Calculate Recommended Limits
        const recommended = {
            water: Math.max(residentCount * BASELINE.water, 500), // Min 500L baseline
            electricity: Math.max(residentCount * BASELINE.electricity, 20),
            foodWaste: Math.max(residentCount * BASELINE.foodWaste, 2)
        };

        const analyze = async (type, current, limit, unit) => {
            if (limit <= 0) return;
            const diff = current - limit;
            const percent = (diff / limit) * 100;

            let severity = 'Normal';
            let msg = '';

            // Thresholds: >10% Warning, >30% Critical
            if (percent > 30) {
                severity = 'High';
                msg = `CRITICAL: ${hostel.name} - ${type} usage is ${percent.toFixed(1)}% above expected limit based on ${residentCount} residents. Current: ${current}${unit} (Limit: ${Math.round(limit)}${unit}).`;
            } else if (percent > 10) {
                severity = 'Medium';
                msg = `WARNING: ${hostel.name} - ${type} usage is ${percent.toFixed(1)}% above expected limit based on residents. Current: ${current}${unit} (Limit: ${Math.round(limit)}${unit}).`;
            }

            if (severity !== 'Normal') {
                await Alert.create({
                    hostelId,
                    type: `AI Analysis: ${type}`,
                    severity,
                    message: msg,
                    status: 'Open'
                });
            }
        };

        await analyze('Water', currentUsage.water, recommended.water, 'L');
        await analyze('Electricity', currentUsage.electricity, recommended.electricity, 'kWh');
        await analyze('Food Waste', currentUsage.foodWaste, recommended.foodWaste, 'kg');

    } catch (err) {
        console.error("Smart Analysis failed", err);
    }
};

exports.approveLog = async (req, res) => {
    try {
        const { id, status } = req.body; // Approved or Rejected
        const log = await ResourceUsage.findByIdAndUpdate(id, { status }, { new: true });

        // If approved, trigger checks
        if (status === 'Approved') {
            await checkAndCreateAlerts(log.hostelId, {
                water: log.water,
                electricity: log.electricity,
                foodWaste: log.foodWaste
            });
        }

        res.json(log);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getPendingLogs = async (req, res) => {
    try {
        const logs = await ResourceUsage.find({ status: 'Pending' }).populate('hostelId');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.uploadExcel = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Expected columns: HostelName, Date, Water, Electricity, FoodWaste
        let count = 0;
        for (const row of data) {
            const hostel = await Hostel.findOne({ name: row.HostelName });
            if (!hostel) continue; // Skip if hostel not found

            const usage = new ResourceUsage({
                hostelId: hostel._id,
                date: new Date(row.Date), // Ensure Excel date format is compatible
                water: row.Water,
                electricity: row.Electricity,
                foodWaste: row.FoodWaste,
                sourceFile: req.file.filename
            });

            await usage.save();
            await checkAndCreateAlerts(hostel._id, { water: row.Water, electricity: row.Electricity, foodWaste: row.FoodWaste });
            count++;
        }

        // Cleanup file
        fs.unlinkSync(req.file.path);

        res.json({ message: `Successfully processed ${count} records` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Helper to generate immediate insight string
const generateInsight = async (hostelId, current) => {
    try {
        const residentCount = await User.countDocuments({ hostelId, role: 'Student' });
        const BASELINE = { water: 135, elec: 5 }; // L and kWh per student

        const limitWater = Math.max(residentCount * BASELINE.water, 500);
        const limitElec = Math.max(residentCount * BASELINE.elec, 20);

        let insights = [];
        if (current.water > limitWater * 1.2) {
            const percent = Math.round((current.water - limitWater) / limitWater * 100);
            insights.push(`High Water Usage (+${percent}% above limit for ${residentCount} residents)`);
        }
        if (current.elec > limitElec * 1.2) {
            const percent = Math.round((current.elec - limitElec) / limitElec * 100);
            insights.push(`High Electricity (+${percent}% above limit)`);
        }

        return insights.length > 0 ? insights.join(', ') : null;
    } catch (e) { return null; }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'Student' });
        const hostelers = await User.countDocuments({ role: 'Student', hostelId: { $ne: null } });
        const dayScholars = totalStudents - hostelers;

        // Food Impact Stats
        const foodLogs = await FoodLog.find({});
        const foodDonated = foodLogs
            .filter(l => l.action === 'Donated')
            .reduce((sum, l) => sum + (l.quantities.leftover || 0), 0);
        const foodComposted = foodLogs
            .filter(l => l.action === 'Composted')
            .reduce((sum, l) => sum + (l.quantities.leftover || 0), 0);

        res.json({
            totalStudents,
            hostelers,
            dayScholars,
            foodDonated: Math.round(foodDonated),
            foodComposted: Math.round(foodComposted)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.submitDailyLog = async (req, res) => {
    try {
        const { logs } = req.body;
        let count = 0;
        let aiInsights = [];

        for (const log of logs) {
            if (!log.hostelId) continue;
            const usage = new ResourceUsage({
                hostelId: log.hostelId,
                date: new Date(log.date || Date.now()),
                water: log.water,
                electricity: log.electricity,
                foodWaste: log.foodWaste,
                sourceFile: 'Manual Entry'
            });
            await usage.save();
            await checkAndCreateAlerts(log.hostelId, log); // Existing Alert logic

            // Immediate Feedback Analysis
            const insight = await generateInsight(log.hostelId, { water: log.water, elec: log.electricity });
            if (insight) {
                const hostel = await Hostel.findById(log.hostelId);
                aiInsights.push(`${hostel.name}: ${insight}`);
            }
            count++;
        }

        res.json({ message: `Saved ${count} logs`, insights: aiInsights });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const { hostelId } = req.query;

        if (hostelId) {
            // Specific Hostel Data
            const usage = await ResourceUsage.find({ hostelId }).populate('hostelId').sort({ date: -1 });

            let comparison = null;
            if (usage.length >= 2) {
                const latest = usage[0];
                const previous = usage[1];
                comparison = {
                    waterDiff: previous.water ? ((latest.water - previous.water) / previous.water) * 100 : 0,
                    elecDiff: previous.electricity ? ((latest.electricity - previous.electricity) / previous.electricity) * 100 : 0,
                    wasteDiff: previous.foodWaste ? ((latest.foodWaste - previous.foodWaste) / previous.foodWaste) * 100 : 0
                };
            }
            return res.json({ history: usage, comparison });
        }

        // Aggregate Data for ALL Hostels (Group by Date)
        const usage = await ResourceUsage.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    water: { $sum: "$water" },
                    electricity: { $sum: "$electricity" },
                    foodWaste: { $sum: "$foodWaste" },
                    originalDate: { $first: "$date" }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // Map back to match schema structure expected by frontend
        const history = usage.map(u => ({
            date: u.originalDate,
            water: u.water,
            electricity: u.electricity,
            foodWaste: u.foodWaste
        }));

        let comparison = null;
        if (history.length >= 2) {
            const latest = history[0];
            const previous = history[1];
            comparison = {
                waterDiff: previous.water ? ((latest.water - previous.water) / previous.water) * 100 : 0,
                elecDiff: previous.electricity ? ((latest.electricity - previous.electricity) / previous.electricity) * 100 : 0,
                wasteDiff: previous.foodWaste ? ((latest.foodWaste - previous.foodWaste) / previous.foodWaste) * 100 : 0
            };
        }

        res.json({ history, comparison });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.downloadReport = async (req, res) => {
    try {
        const data = await ResourceUsage.find({}).populate('hostelId').sort({ date: -1 });

        const workbook = xlsx.utils.book_new();
        const worksheetData = data.map(record => ({
            Date: new Date(record.date).toLocaleDateString(),
            Hostel: record.hostelId?.name || 'Unknown',
            Water_Liters: record.water,
            Electricity_kWh: record.electricity,
            FoodWaste_kg: record.foodWaste,
            Status: record.status,
            Source: record.sourceFile || 'Manual'
        }));

        const worksheet = xlsx.utils.json_to_sheet(worksheetData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Consumption Report');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="Campus_Resource_Report.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addHostel = async (req, res) => {
    try {
        const count = await Hostel.countDocuments();
        if (count >= 50) return res.status(400).json({ message: 'Hostel limit (50) reached.' });

        const { name, capacity } = req.body;
        if (!name || !capacity) return res.status(400).json({ message: 'Hostel name and capacity are required' });

        const newHostel = new Hostel({ name, capacity, type: 'Hostel' });
        await newHostel.save();

        res.status(201).json(newHostel);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getHostels = async (req, res) => {
    try {
        const hostels = await Hostel.find();
        res.json(hostels);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteHostel = async (req, res) => {
    try {
        const { id } = req.params;
        await Hostel.findByIdAndDelete(id);
        res.json({ message: 'Hostel deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMyLogs = async (req, res) => {
    try {
        // Find logs for today or recent
        const logs = await ResourceUsage.find({}).sort({ date: -1 }).limit(20).populate('hostelId');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
