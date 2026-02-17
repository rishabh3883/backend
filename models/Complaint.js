const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['Leakage', 'Electricity', 'Cleanliness', 'WiFi', 'Food', 'Other', 'Emergency'] },
    title: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String }, // Path to image
    status: { type: String, enum: ['Pending', 'Resolved', 'Rejected', 'In Progress', 'Accepted', 'On The Way'], default: 'Pending' },

    // Escalation & Assignment
    targetRole: { type: String, enum: ['Admin', 'staff'], default: 'staff' }, // Default goes to Staff
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalated: { type: Boolean, default: false }, // If true, Admin sees it even if target was Staff
    lastAssignedAt: { type: Date }, // To track the 2-minute window

    // Communication
    adminComment: { type: String },
    messages: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        message: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],

    isVerified: { type: Boolean, default: false },
    feedback: { type: String, enum: ['Pending', 'Satisfied', 'Unsatisfied'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
