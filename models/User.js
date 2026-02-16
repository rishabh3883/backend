const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    enrollmentNumber: { type: String, unique: true, sparse: true }, // Unique for Students
    password: { type: String, required: true },
    role: { type: String, enum: ['Student', 'Admin', 'Employee', 'Security', 'Pending', 'Rejected'], default: 'Pending' },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' }, // Optional, for Students/Employees
    roomNumber: { type: String },
    userImage: { type: String, default: '' }, // Profile Image
    contributionStreak: { type: Number, default: 0 },
    lastLogin: { type: Date },
    lastActiveDate: { type: Date }, // For consistent streak calculation
    activityHistory: [{ type: Date }], // Persistent history of active days
    badges: [{ type: String }], // Gamification

    // Approval System
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    // Ban & Block System
    isBlocked: { type: Boolean, default: false },
    blockExpiresAt: { type: Date }, // Null = Permanent if isBlocked is true
    blockReason: { type: String },
    violationCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
