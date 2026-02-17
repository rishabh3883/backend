const mongoose = require('mongoose');
const User = require('./server/models/User');
const Complaint = require('./server/models/Complaint');
require('dotenv').config({ path: './server/.env' });

const runDebug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const complaints = await Complaint.find({ status: 'Pending' });
        console.log(`Total Pending Complaints: ${complaints.length}`);

        const countsByType = {};
        complaints.forEach(c => {
            countsByType[c.type] = (countsByType[c.type] || 0) + 1;
        });
        console.log("Counts by Type:", countsByType);

        const employees = await User.find({ role: 'Employee' });
        console.log(`Total Employees found: ${employees.length}`);

        for (const emp of employees) {
            const load = await Complaint.countDocuments({ assignedTo: emp._id, status: { $in: ['On The Way', 'In Progress'] } });
            console.log(`- Employee: ${emp.name} (${emp.email}) | ID: ${emp._id} | Current Load: ${load}`);
        }

        const reserved = await User.findOne({ email: 'reserved@college.edu' });
        if (reserved) {
            console.log("Reserved User Found:", reserved.email);
        } else {
            console.log("ERROR: Reserved User NOT FOUND in DB!");
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

runDebug();
