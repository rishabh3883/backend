const Complaint = require('../models/Complaint');
const User = require('../models/User');

exports.createComplaint = async (req, res) => {
    try {
        console.log("--- createComplaint called ---");
        console.log("Body:", req.body);

        const { type, title, description } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = req.file.path.replace(/\\/g, "/"); // Normalize path
        }

        // Fix "undefined" string issue with FormData
        // FormData often sends "undefined" or "null" as strings for empty fields
        let targetRole = req.body.targetRole;
        if (!targetRole || targetRole === 'undefined' || targetRole === 'null') {
            targetRole = 'staff';
        }
        console.log("Final targetRole:", targetRole);

        const complaint = new Complaint({
            studentId: req.user.id,
            type,
            title,
            description,
            image: imageUrl,
            targetRole: targetRole
        });

        // --- AI Load Balancing Logic ---
        // Check how many PENDING complaints exist for this type
        const pendingCount = await Complaint.countDocuments({ status: 'Pending', type: type });
        const THRESHOLD = 5; // AI kicks in after 5 active complaints
        console.log(`AI Check: Type=${type}, Pending=${pendingCount}, Threshold=${THRESHOLD}`);

        // Only apply AI if it's targeted to 'staff' (Admin should receive theirs directly)
        if (pendingCount >= THRESHOLD && targetRole === 'staff') {
            console.log(">>> AI LOAD BALANCING TRIGGERED <<<");

            // Find least loaded Employee (Excluding Security & Reserved)
            // We exclude 'Security' badge holders from general maintenance/academic tasks
            const employees = await User.find({
                role: 'Employee',
                badges: { $nin: ['Security', 'System'] },
                email: { $ne: 'reserved@college.edu' } // Double check to exclude reserved
            });

            // Calculate load for each employee
            const employeeLoads = await Promise.all(employees.map(async (emp) => {
                const count = await Complaint.countDocuments({ assignedTo: emp._id, status: { $in: ['On The Way', 'In Progress'] } });
                return { emp, count };
            }));

            // Sort by load (ascending)
            employeeLoads.sort((a, b) => a.count - b.count);

            // Filter out the reserved user from general assignment pool (unless they are the only option?)
            // Actually, bestEmployee logic should pick real staff first.
            const MAX_LOAD = 10; // Staff is "busy" if they have 10+ active tasks
            const bestEmployee = employeeLoads.find(e => e.emp.email !== 'reserved@college.edu');

            // If staff exists AND is under the max load limit
            if (bestEmployee && bestEmployee.count < MAX_LOAD) {
                complaint.assignedTo = bestEmployee.emp._id;
                complaint.status = 'On The Way';
                complaint.messages.push({
                    senderId: null, // System
                    role: 'System',
                    message: `⚠️ AI ALERT: High Traffic in ${type}. Auto-assigned to ${bestEmployee.emp.name} (Load: ${bestEmployee.count}/${MAX_LOAD}).`
                });
                console.log(`Assigned to: ${bestEmployee.emp.name}`);
            } else {
                // Fallback to Reserved Security (If no staff OR all staff busy)
                console.log("No available staff (High Load or None Found). Fallback to Reserved Security.");
                const reservedUser = await User.findOne({ email: 'reserved@college.edu' });
                if (reservedUser) {
                    complaint.assignedTo = reservedUser._id;
                    complaint.status = 'On The Way';
                    complaint.messages.push({
                        senderId: null,
                        role: 'System',
                        message: `⚠️ STAFF BUSY/UNAVAILABLE. Forwarded to Reserved Security AI.`
                    });
                }
            }
        }
        // -------------------------------

        await complaint.save();

        // Gamification: Update Daily Streak for posting
        const user = await User.findById(req.user.id);
        if (user) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
            if (lastActive) lastActive.setHours(0, 0, 0, 0);

            if (!lastActive || lastActive < today) {
                if (lastActive && (today.getTime() - lastActive.getTime() === 1000 * 60 * 60 * 24)) {
                    // Consecutive day
                    user.contributionStreak = (user.contributionStreak || 0) + 1;
                } else if (!lastActive || (today.getTime() - lastActive.getTime() > 1000 * 60 * 60 * 24)) {
                    // Streak broken or first time (reset to 1)
                    user.contributionStreak = 1;
                }
                // If already active today, do nothing to streak
                user.lastActiveDate = today;
                if (!user.activityHistory) user.activityHistory = [];
                user.activityHistory.push(today);
                await user.save();
            }
        }

        res.status(201).json(complaint);
    } catch (err) {
        console.error("Error in createComplaint:", err);
        res.status(500).json({ message: err.message });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        let query = {};

        // Student: See their own
        if (req.user.role === 'Student') {
            query = { studentId: req.user.id };
        }
        // Admin: See EVERYTHING + Escalated Ones
        else if (req.user.role === 'Admin') {
            query = {}; // Admin sees all
        }
        // Employee (Staff): See assigned to 'staff' OR specifically assigned to them
        else if (req.user.role === 'Employee') {
            query = {
                $or: [
                    { targetRole: 'staff', status: 'Pending' }, // Unassigned pool
                    { assignedTo: req.user.id } // Assigned to me
                ]
            };
        }

        const complaints = await Complaint.find(query)
            .populate({
                path: 'studentId',
                select: 'name email hostelId roomNumber',
                populate: { path: 'hostelId', select: 'name' }
            })
            .populate('assignedTo', 'name email role')
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

        // Admin assigning to someone else
        if (req.user.role === 'Admin' && req.body.assignedTo) {
            complaint.assignedTo = req.body.assignedTo;
            complaint.targetRole = 'Admin'; // Mark as Admin-directed
            complaint.status = 'On The Way';

            // Notify the assigned Staff? (Ideally yes, but for now just saving)
            const staff = await User.findById(req.body.assignedTo);
            const staffName = staff ? staff.name : 'Unknown Staff';

            complaint.messages.push({
                senderId: req.user.id,
                role: 'System',
                message: `Task assigned to ${staffName} by Admin`
            });

            await complaint.save();
            return res.json({ message: 'Task Assigned', complaint, officer: staffName });
        }

        // Self-assignment (Staff picks up task)
        complaint.assignedTo = req.user.id;
        complaint.status = 'On The Way';

        // Notify Student via Admin Comment (Simulated Push)
        const staffMember = await User.findById(req.user.id);
        const officerName = staffMember ? staffMember.name : 'Unknown Staff';

        // Add system message
        complaint.messages.push({
            senderId: req.user.id,
            role: 'System',
            message: `Task accepted by ${officerName}`
        });

        await complaint.save();

        res.json({ message: 'Task Accepted', complaint, officer: officerName });
    } catch (err) {
        console.error("Error in assignComplaint:", err);
        res.status(500).json({ message: err.message });
    }
};

exports.escalateComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findOne({ _id: req.params.id, studentId: req.user.id });
        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        // Check 2 minute rule
        const timeDiff = Date.now() - new Date(complaint.createdAt).getTime();
        if (timeDiff < 2 * 60 * 1000) { // 2 mins
            return res.status(400).json({ message: 'Please wait at least 2 minutes before escalating.' });
        }

        complaint.escalated = true;
        complaint.targetRole = 'Admin'; // Force move to Admin
        complaint.status = 'Pending'; // Re-open if it was closed or ignored

        complaint.messages.push({
            senderId: req.user.id,
            role: 'System',
            message: 'Complaint ESCALATED onto Admin due to delay.'
        });

        await complaint.save();
        res.json(complaint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        complaint.messages.push({
            senderId: req.user.id,
            role: req.user.role,
            message
        });

        await complaint.save();
        res.json(complaint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
