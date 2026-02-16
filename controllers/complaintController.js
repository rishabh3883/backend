const Complaint = require('../models/Complaint');
const User = require('../models/User');

exports.createComplaint = async (req, res) => {
    try {
        const { type, title, description } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = req.file.path.replace(/\\/g, "/"); // Normalize path
        }

        const complaint = new Complaint({
            studentId: req.user.id,
            type,
            title,
            description,
            imageUrl
        });

        await complaint.save();

        // Gamification: Update Daily Streak for posting
        const user = await User.findById(req.user.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
        if (lastActive) lastActive.setHours(0, 0, 0, 0);

        if (!lastActive || lastActive < today) {
            if (lastActive && (today - lastActive === 1000 * 60 * 60 * 24)) {
                // Consecutive day
                user.contributionStreak += 1;
            } else if (!lastActive || (today - lastActive > 1000 * 60 * 60 * 24)) {
                // Streak broken or first time (reset to 1)
                user.contributionStreak = 1;
            }
            // If already active today, do nothing to streak
            user.lastActiveDate = today;
            user.activityHistory.push(today);
            await user.save();
        }

        res.status(201).json(complaint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Student') {
            query = { studentId: req.user.id };
        }
        // Employees/Admins see all (or filtered by status if needed)

        const complaints = await Complaint.find(query)
            .populate({
                path: 'studentId',
                select: 'name email hostelId roomNumber',
                populate: { path: 'hostelId', select: 'name' }
            })
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateComplaintStatus = async (req, res) => {
    try {
        const { status, adminComment, feedback } = req.body;

        // Security: If Student, they can ONLY update feedback/verification
        if (req.user.role === 'Student') {
            if (!feedback) return res.status(403).json({ message: 'Students can only provide feedback' });
            // Continued below...
        }

        // Prepare update object
        let updateData = {};

        // If Student verifies (Feedback Loop)
        if (feedback) {
            updateData.feedback = feedback;
            if (feedback === 'Satisfied') {
                updateData.isVerified = true;
                updateData.status = 'Resolved'; // Confirmed
            } else if (feedback === 'Unsatisfied') {
                updateData.isVerified = false;
                updateData.status = 'In Progress'; // Re-open
            }
        } else {
            // Admin/Employee normal update
            updateData.status = status;
            updateData.adminComment = adminComment;
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('studentId');

        // Gamification: Award Badges for Resolved Complaints
        if (complaint.studentId && (status === 'Resolved' || updateData.status === 'Resolved')) {
            const user = await User.findById(complaint.studentId._id);

            // Count total resolved complaints for this student
            const resolvedCount = await Complaint.countDocuments({
                studentId: user._id,
                status: 'Resolved'
            });

            const newBadges = [];
            if (resolvedCount >= 1 && !user.badges.includes('Vigilant Student')) newBadges.push('Vigilant Student');
            if (resolvedCount >= 5 && !user.badges.includes('Eco Warrior')) newBadges.push('Eco Warrior');
            if (resolvedCount >= 10 && !user.badges.includes('Campus Hero')) newBadges.push('Campus Hero');
            if (resolvedCount >= 25 && !user.badges.includes('Legend')) newBadges.push('Legend');

            if (newBadges.length > 0) {
                user.badges.push(...newBadges);
                await user.save();
            }
        }

        res.json(complaint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Staff accepts the task
exports.assignComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).populate('studentId');
        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        complaint.assignedTo = req.user.id;
        complaint.status = 'On The Way';

        // Notify Student via Admin Comment (Simulated Push)
        const staffMember = await User.findById(req.user.id);
        complaint.adminComment = `🚨 HELP COMING: ${staffMember.name} is on the way!`;

        await complaint.save();

        res.json({ message: 'Task Accepted', complaint, officer: staffMember.name });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
