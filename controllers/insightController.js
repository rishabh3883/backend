const ResourceUsage = require('../models/ResourceUsage');
const EnergyUsage = require('../models/EnergyUsage');
const LibraryStatus = require('../models/LibraryStatus');
const Hostel = require('../models/Hostel');

const getInsights = async (req, res) => {
    try {
        const { role } = req.query; // Admin, Staff, Student
        const insights = [];
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        // --- Fetch All Hostels ---
        const hostels = await Hostel.find();

        // --- Arrays to track specific culprits ---
        let waterCulprits = { critical: [], warning: [] };
        let foodCulprits = { critical: [], warning: [] };
        let elecCulprits = { critical: [], warning: [] };

        let totalWaterUsage = 0;
        let totalWaterAvg = 0;

        // --- Iterate per Hostel for Granular Analysis ---
        for (const hostel of hostels) {
            // Get last 7 days logs for this hostel
            const logs = await ResourceUsage.find({
                hostelId: hostel._id,
                date: { $gte: sevenDaysAgo }
            }).sort({ date: 1 });

            if (logs.length === 0) continue;

            const current = logs[logs.length - 1]; // Latest log

            // Water Analysis
            const avgWater = logs.reduce((acc, curr) => acc + (curr.water || 0), 0) / logs.length;
            totalWaterUsage += current.water;
            totalWaterAvg += avgWater;

            if (avgWater > 0) {
                if (current.water > avgWater * 1.15) waterCulprits.critical.push(hostel.name);
                else if (current.water > avgWater * 1.05) waterCulprits.warning.push(hostel.name);
            }

            // Food Analysis
            const avgFood = logs.reduce((acc, curr) => acc + (curr.foodWaste || 0), 0) / logs.length;
            if (avgFood > 0) {
                if (current.foodWaste > avgFood * 1.15) foodCulprits.critical.push(hostel.name);
                else if (current.foodWaste > avgFood * 1.05) foodCulprits.warning.push(hostel.name);
            }

            // Electricity Analysis
            const avgElec = logs.reduce((acc, curr) => acc + (curr.electricity || 0), 0) / logs.length;
            if (avgElec > 0) {
                if (current.electricity > avgElec * 1.15) elecCulprits.critical.push(hostel.name);
                else if (current.electricity > avgElec * 1.05) elecCulprits.warning.push(hostel.name);
            }
        }

        // --- 1. Water Insight Construction ---
        let waterStatus = "Normal";
        let waterHeadline = "Water usage is stable.";
        let waterInsight = `Total Campus Usage: ${totalWaterUsage.toFixed(0)}L (Avg: ${totalWaterAvg.toFixed(0)}L).`;
        let waterAction = "Maintain current monitoring.";

        if (waterCulprits.critical.length > 0) {
            waterStatus = "Critical";
            waterHeadline = "Abnormal water spike detected!";
            waterInsight = `Significant spikes in: ${waterCulprits.critical.join(', ')}.`;
            waterAction = `Check pipelines in: ${waterCulprits.critical.join(', ')}.`;
        } else if (waterCulprits.warning.length > 0) {
            waterStatus = "Warning";
            waterHeadline = "Water usage rising.";
            waterInsight = `Rising trends in: ${waterCulprits.warning.join(', ')}.`;
            waterAction = `Inspect taps in: ${waterCulprits.warning.join(', ')}.`;
        }

        insights.push({
            headline: waterHeadline,
            resource: "Water",
            status: waterStatus,
            insight: waterInsight,
            impact: waterStatus === 'Normal' ? "Conservation goals met." : "Potential leakage or overuse detected.",
            suggestedAction: waterAction,
            audience: ["Admin", "Staff", "Student"]
        });

        // --- 2. Food Waste Insight ---
        let foodStatus = "Normal";
        let foodHeadline = "Food waste minimized.";
        let foodInsight = "Waste levels are within acceptable limits.";
        let foodAction = "Keep it up.";

        if (foodCulprits.critical.length > 0) {
            foodStatus = "Critical";
            foodHeadline = "High food wastage.";
            foodInsight = `Excessive waste in: ${foodCulprits.critical.join(', ')}.`;
            foodAction = `Adjust procurement for: ${foodCulprits.critical.join(', ')}.`;
        } else if (foodCulprits.warning.length > 0) {
            foodStatus = "Warning";
            foodHeadline = "Food waste rising.";
            foodInsight = `Slight increase in: ${foodCulprits.warning.join(', ')}.`;
            foodAction = `Monitor serving sizes in: ${foodCulprits.warning.join(', ')}.`;
        }

        insights.push({
            headline: foodHeadline,
            resource: "Food",
            status: foodStatus,
            insight: foodInsight,
            impact: foodStatus === 'Normal' ? "Efficient kitchen operations." : "Wasted meals and increased costs.",
            suggestedAction: foodAction,
            audience: ["Admin", "Staff"]
        });

        // --- 3. Electricity Insight ---
        let elecStatus = "Normal";
        let elecHeadline = "Electricity usage optimized.";
        let elecInsight = "Consumption matches expected baselines.";
        let elecAction = "No action needed.";

        if (elecCulprits.critical.length > 0) {
            elecStatus = "Critical";
            elecHeadline = "Power consumption spike.";
            elecInsight = `High usage in: ${elecCulprits.critical.join(', ')}.`;
            elecAction = `Check AC/Lighting in: ${elecCulprits.critical.join(', ')}.`;
        } else if (elecCulprits.warning.length > 0) {
            elecStatus = "Warning";
            elecHeadline = "Power usage rising.";
            elecInsight = `Above average in: ${elecCulprits.warning.join(', ')}.`;
            elecAction = `Audit appliances in: ${elecCulprits.warning.join(', ')}.`;
        }

        insights.push({
            headline: elecHeadline,
            resource: "Electricity",
            status: elecStatus,
            insight: elecInsight,
            impact: elecStatus === 'Normal' ? "Carbon footprint reduced." : "Higher electricity bill expected.",
            suggestedAction: elecAction,
            audience: ["Admin", "Staff"]
        });


        // --- 4. Library (Keep existing logic) ---
        const libraryData = await LibraryStatus.find().sort({ lastUpdated: -1 }).limit(1);
        if (libraryData && libraryData.length > 0) {
            const lib = libraryData[0];
            const total = lib.totalSeats || 100;
            const occupied = lib.occupiedSeats || 0;
            const occupancy = (occupied / total) * 100;

            let libStatus = "Normal";
            let libHeadline = "Library study environment optimal.";
            if (occupancy > 90) {
                libStatus = "Critical";
                libHeadline = "Library Overcrowded.";
            } else if (occupancy > 75) {
                libStatus = "Warning";
                libHeadline = "Library nearing capacity.";
            }

            insights.push({
                headline: libHeadline,
                resource: "Library",
                status: libStatus,
                insight: `Occupancy at ${occupancy.toFixed(0)}% (${occupied}/${total} seats).`,
                impact: "Student productivity affected.",
                suggestedAction: occupancy > 90 ? "Open seminar halls for study." : "Check AC levels.",
                audience: ["Student", "Admin"]
            });
        }

        // --- 5. Sustainability Score ---
        let score = 100;
        [waterStatus, foodStatus, elecStatus].forEach(s => {
            if (s === 'Warning') score -= 10;
            if (s === 'Critical') score -= 20;
        });
        if (score < 0) score = 0;

        insights.unshift({
            headline: `Campus Sustainability Score: ${score}/100`,
            resource: "Sustainability",
            status: score > 80 ? "Normal" : (score > 60 ? "Warning" : "Critical"),
            insight: score > 80 ? "Excellent eco-friendly operations." : "Multiple resources exceeding limits.",
            impact: "Tracks overall campus efficiency.",
            suggestedAction: score > 80 ? "Promote success on social media." : "Review critical alerts below.",
            audience: ["Admin", "Student", "Staff"]
        });

        const filteredInsights = role
            ? insights.filter(i => i.audience.includes(role))
            : insights;

        res.json(filteredInsights);

    } catch (error) {
        console.error("Error generating insights:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getInsights };
