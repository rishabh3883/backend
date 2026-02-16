const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['Leakage', 'Electricity', 'Cleanliness', 'Other', 'Emergency'] },
    title: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String }, // Path to image
    status: { type: String, enum: ['Pending', 'Resolved', 'Rejected', 'In Progress', 'Accepted', 'On The Way'], default: 'Pending' },
    adminComment: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isVerified: { type: Boolean, default: false },
    feedback: { type: String, enum: ['Pending', 'Satisfied', 'Unsatisfied'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
