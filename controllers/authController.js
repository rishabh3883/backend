const LoginHistory = require('../models/LoginHistory');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        console.log("Register Request:", req.body);
        let { name, email, password, role, hostelId, enrollmentNumber } = req.body;

        // Sanitize inputs
        email = email.toLowerCase().trim();
        if (enrollmentNumber) {
            enrollmentNumber = enrollmentNumber.trim();
            if (enrollmentNumber === '') enrollmentNumber = undefined;
        } else {
            enrollmentNumber = undefined;
        }

        if (!hostelId) hostelId = undefined; // Fix: Prevent empty string casting error

        // Check if user exists (Email)
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Check if enrollment number exists (only if provided)
        if (enrollmentNumber) {
            const enrollmentExists = await User.findOne({ enrollmentNumber });
            if (enrollmentExists) return res.status(400).json({ message: 'Enrollment Number already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({
            name,
            email,
            enrollmentNumber,
            password: hashedPassword,
            role: role === 'Employee' ? 'Employee' : 'Pending', // Auto-approve Staff for hackathon ease
            hostelId
        });

        await user.save();
        res.status(201).json({ message: 'Registration successful. Please wait for Admin approval.' });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.toLowerCase().trim();

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`Login failed: User not found for email ${email}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log(`Login attempt for ${email}. Role: ${user.role}`);

        if (user.role === 'Pending') return res.status(403).json({ message: 'Account pending approval. Please contact Admin.' });
        if (user.role === 'Rejected') return res.status(403).json({ message: 'Account registration rejected. Please contact Admin.' });

        // Check for Ban/Block
        if (user.isBlocked) {
            if (user.blockExpiresAt && new Date() > user.blockExpiresAt) {
                // Ban expired, auto-unblock
                user.isBlocked = false;
                user.blockExpiresAt = undefined;
                user.blockReason = undefined;
                await user.save();
            } else {
                const reason = user.blockReason || 'Violation of rules';
                const expiry = user.blockExpiresAt ? ` until ${new Date(user.blockExpiresAt).toLocaleDateString()}` : ' PERMANENTLY';
                return res.status(403).json({ message: `Access Denied: Account Blocked${expiry}. Reason: ${reason}` });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for ${email}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '1d' }
        );

        // Save Login History
        await LoginHistory.create({
            userId: user._id,
            email: user.email,
            ipAddress: req.ip || req.connection.remoteAddress,
            device: req.headers['user-agent'],
            status: 'Success'
        });

        // Persistent Gamification & Streak Logic
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to midnight

        let lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
        if (lastActive) lastActive.setHours(0, 0, 0, 0);

        if (!lastActive) {
            // First time logic
            user.contributionStreak = 1;
            user.activityHistory = [today];
            user.lastActiveDate = today;
        } else {
            const diffTime = Math.abs(today - lastActive);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Streak continues
                user.contributionStreak += 1;
                user.activityHistory.push(today);
                user.lastActiveDate = today;
            } else if (diffDays > 1) {
                // Streak broken
                user.contributionStreak = 1; // Reset
                user.activityHistory.push(today);
                user.lastActiveDate = today;
            }
            // If diffDays === 0, already logged in today, do nothing
        }

        // Update User's lastLogin (keep original logic for login timestamp)
        user.lastLogin = new Date();
        await user.save();

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                hostelId: user.hostelId,
                enrollmentNumber: user.enrollmentNumber
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('hostelId');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
