const mongoose = require('mongoose');

const SustainabilityTaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['Irrigation', 'Energy', 'Infrastructure', 'General'], default: 'General' },
    status: { type: String, enum: ['Suggested', 'Published', 'In Progress', 'Completed', 'Rejected'], default: 'Suggested' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    weatherCondition: { type: String }, // Context: "Sunny, 40C"
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: specific staff
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SustainabilityTask', SustainabilityTaskSchema);
