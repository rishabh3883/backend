const User = require('../models/User');

// Get Pending Users (Admin Only)
exports.getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'Pending' }).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Approve/Reject User (Admin Only)
exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, role } = req.body; // status: 'Approved' | 'Rejected', role: 'Student' | 'Staff' | 'Security'

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        let updateData = {
            approvedBy: req.user.id,
            approvedAt: new Date()
        };

        if (status === 'Approved') {
            if (!role) return res.status(400).json({ message: 'Role is required for approval' });
            updateData.role = role;
        } else {
            updateData.role = 'Rejected';
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: `User ${status}`, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get User Stats for Admin Dashboard
exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const students = await User.countDocuments({ role: 'Student' });
        const staff = await User.countDocuments({ role: 'Employee' });
        const security = await User.countDocuments({ role: 'Security' });
        const pending = await User.countDocuments({ role: 'Pending' });

        // New Users Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const newToday = await User.countDocuments({ createdAt: { $gte: startOfDay } });

        res.json({
            total: totalUsers,
            students,
            staff,
            security,
            pending,
            newToday
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get All Users (Admin Only) - with optional role filter
exports.getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};
        if (role) query.role = role;

        // Exclude current admin from list to prevent self-lockout
        query._id = { $ne: req.user.id };

        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Manage User Access (Block/Unblock/Warn)
exports.manageUserAccess = async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, reason } = req.body; // action: 'warn', 'block_temp', 'block_perm', 'unblock'

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (action === 'warn') {
            user.violationCount += 1;
        } else if (action === 'block_temp') {
            user.isBlocked = true;
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            user.blockExpiresAt = expiry;
            user.blockReason = reason || 'Temporary Suspension';
        } else if (action === 'block_perm') {
            user.isBlocked = true;
            user.blockExpiresAt = null; // Permanent
            user.blockReason = reason || 'Permanent Ban';
        } else if (action === 'unblock') {
            user.isBlocked = false;
            user.blockExpiresAt = undefined;
            user.blockReason = undefined;
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await user.save();
        res.json({ message: `User ${action} successful`, user });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
