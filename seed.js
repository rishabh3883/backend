const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Hostel = require('./models/Hostel');
const LibraryStatus = require('./models/LibraryStatus');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedData = async () => {
    try {
        // Clear old data
        await User.deleteMany();
        await Hostel.deleteMany();
        await LibraryStatus.deleteMany();

        // Create Hostels
        const hostels = await Hostel.insertMany([
            { name: 'Block A (Boys)', capacity: 200, warden: 'Mr. Sharma' },
            { name: 'Block B (Girls)', capacity: 150, warden: 'Mrs. Verma' },
            { name: 'Block C (Freshers)', capacity: 100, warden: 'Mr. Singh' }
        ]);
        console.log('Hostels Seeded');

        // Create Users
        const commonPassword = await bcrypt.hash('password123', 10);
        const securityPassword = await bcrypt.hash('security123', 10);

        await User.create([
            {
                name: 'Admin User',
                email: 'admin@college.edu',
                password: commonPassword,
                role: 'Admin'
            },
            {
                name: 'Rishabh Gupta',
                email: 'rishabh@student.edu',
                password: commonPassword,
                role: 'Student',
                enrollmentNumber: 'STUDENT123',
                hostelId: hostels[0]._id
            },
            {
                name: 'Maintenance Staff',
                email: 'staff@college.edu',
                password: commonPassword,
                role: 'Employee'
            },
            {
                name: 'Chief Security Officer',
                email: 'security@campus.com',
                password: securityPassword,
                role: 'Employee',
                badges: ['Security']
            }
        ]);
        console.log('Users Seeded');

        // Init Library
        await LibraryStatus.create({ totalSeats: 50, occupiedSeats: 12 });
        console.log('Library Seeded');

        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
