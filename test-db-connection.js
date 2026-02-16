require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testConnection = async () => {
    try {
        console.log("---------------------------------------------------");
        console.log("TESTING DATABASE CONNECTION...");
        console.log("CWD:", process.cwd());

        const dbUri = process.env.MONGO_URI;
        if (!dbUri) {
            console.error("CRITICAL ERROR: MONGO_URI is missing from .env");
            process.exit(1);
        }

        console.log("Connecting to:", dbUri.split('@')[1]); // Mask password

        await mongoose.connect(dbUri);
        console.log("✅ MongoDB Connected Successfully!");

        // Test Write
        const testUserEmail = `test_${Date.now()}@example.com`;
        const testUser = new User({
            name: "Test User",
            email: testUserEmail,
            password: "hashedpassword123",
            role: "Student",
            enrollmentNumber: undefined
        });

        const savedUser = await testUser.save();
        console.log("✅ Checksum: Write Operation Successful!");
        console.log("Created Test User ID:", savedUser._id);
        console.log("---------------------------------------------------");

        // Clean up
        await User.deleteOne({ _id: savedUser._id });
        console.log("✅ Cleanup: Test User Deleted.");
        console.log("---------------------------------------------------");
        console.log("CONCLUSION: Database connection and writes are WORKING.");
        console.log("If Signup fails, the issue is in the API handling, NOT the database.");

        process.exit(0);

    } catch (error) {
        console.error("❌ DATABASE ERROR:", error);
        process.exit(1);
    }
};

testConnection();
