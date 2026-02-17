const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
require('dotenv').config();

const runDebug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const complaints = await Complaint.find({ status: 'Pending' });
        const countsByType = {};
        complaints.forEach(c => {
            countsByType[c.type] = (countsByType[c.type] || 0) + 1;
        });

        const employees = await User.find({ role: 'Employee' });
        const reserved = await User.findOne({ email: 'reserved@college.edu' });

        const report = {
            totalPending: complaints.length,
            countsByType,
            employees: [],
            reservedUserFound: !!reserved
        };

        for (const emp of employees) {
            const load = await Complaint.countDocuments({ assignedTo: emp._id, status: { $in: ['On The Way', 'In Progress'] } });
            report.employees.push({
                name: emp.name,
                email: emp.email,
                id: emp._id,
                load
            });
        }

        console.log("DEBUG_REPORT_START");
        console.log(JSON.stringify(report, null, 2));
        console.log("DEBUG_REPORT_END");

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

runDebug();
