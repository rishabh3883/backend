const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log("db.js: Checking environment variables...");
        if (!process.env.MONGO_URI) {
            console.error("CRITICAL: MONGO_URI is missing from .env!");
            console.error("Looking for .env in:", process.cwd());
        }

        // Use a local URI for hackathon if no ENV provided, or fallback to a demo cloud one
        const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-campus';
        console.log(`Attempting to connect to MongoDB... (Source: ${process.env.MONGO_URI ? 'ENV' : 'Fallback'})`);
        const conn = await mongoose.connect(dbUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
