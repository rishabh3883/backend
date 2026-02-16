const SustainabilityTask = require('../models/SustainabilityTask');

// SIMULATED AI LOGIC (Rule-based)
const analyzeEnvironment = (weather, temp, season) => {
    const suggestions = [];
    const t = parseInt(temp);
    const w = weather.toLowerCase();

    // 1. Extreme Heat / Long-term Heat
    if (t > 30) {
        suggestions.push({
            title: 'Heatwave Protocol: Hydration Stations',
            description: `Current temp is ${t}°C. Deploy portable water stations at main campus gates and playgrounds for students and staff.`,
            type: 'Infrastructure',
            priority: 'High'
        });
        suggestions.push({
            title: 'Green Cover Expansion (Long-term)',
            description: `Persistent high temperatures detected. Initiate a "Campus Tree Plantation Drive" to increase shade and reduce urban heat island effect. Target areas: Parking lots and walkways.`,
            type: 'Infrastructure',
            priority: 'Medium'
        });
        suggestions.push({
            title: 'Energy: Solar Optimization',
            description: `High sun intensity. Ensure all solar panels are dust-free to maximize generation efficiency during this peak usage period.`,
            type: 'Energy',
            priority: 'Medium'
        });
    }

    // 2. Rainy Season
    if (w.includes('rain') || w.includes('storm')) {
        suggestions.push({
            title: 'Rainwater Harvesting Activation',
            description: 'Precipitation detected. Open diversion valves to underground storage tanks. Ensure roof gutters are free of debris.',
            type: 'Infrastructure',
            priority: 'High'
        });
        suggestions.push({
            title: 'Vector Control (Post-Rain)',
            description: 'Schedule fumigation for hostel grounds 24 hours after rain stops to prevent mosquito breeding.',
            type: 'General',
            priority: 'High'
        });
        suggestions.push({
            title: 'Drainage Inspection',
            description: 'Inspect campus drainage points for clogging to prevent waterlogging near the library and admin block.',
            type: 'Infrastructure',
            priority: 'High'
        });
    }

    // 3. Winter / Cold
    if (t < 15) {
        suggestions.push({
            title: 'Energy Conservation: Heating',
            description: 'Low temp detected. Optimize central heating schedules. Ensure hostel windows are sealed to prevent heat loss.',
            type: 'Energy',
            priority: 'Medium'
        });
    }

    // 4. Air Quality (Simulated)
    if (w.includes('haze') || w.includes('smoke') || w.includes('fog')) {
        suggestions.push({
            title: 'Air Quality Protocol',
            description: 'Poor visibility and AQI. Suspend outdoor sports activities. Ensure air purifiers in the library are running at max efficiency.',
            type: 'General',
            priority: 'High'
        });
    }

    // Default Fallback
    if (suggestions.length === 0) {
        suggestions.push({
            title: 'Routine Sustainability Check',
            description: `Conditions are nominal (${weather}, ${t}°C). Conduct standard waste segregation audit in the cafeteria.`,
            type: 'General',
            priority: 'Low'
        });
    }

    return suggestions;
};

exports.observeAndSuggest = async (req, res) => {
    try {
        const { weather, temp, season } = req.body;

        const aiSuggestions = analyzeEnvironment(weather, temp, season);

        // Save suggestions to DB as "Suggested"
        const savedTasks = await Promise.all(aiSuggestions.map(async task => {
            return await SustainabilityTask.create({
                ...task,
                weatherCondition: `${weather}, ${temp}°C`,
                status: 'Suggested'
            });
        }));

        res.json({ message: 'AI Analysis Complete', tasks: savedTasks });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getTasks = async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};

        // Admin sees everything, Staff sees only Published/InProgress
        if (role === 'Employee') {
            query.status = { $in: ['Published', 'In Progress', 'Completed'] };
        }

        const tasks = await SustainabilityTask.find(query).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // e.g., 'Published', 'Completed'

        const task = await SustainabilityTask.findByIdAndUpdate(id, { status }, { new: true });
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
