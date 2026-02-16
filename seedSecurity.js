const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_campus', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to DB');

    const email = 'security@campus.com';
    // Remove if exists to ensure clean state with known password
    await User.deleteOne({ email });

    const hashedPassword = await bcrypt.hash('security123', 10);
    const user = new User({
        name: 'Chief Security Officer',
        email: email,
        password: hashedPassword,
        role: 'Employee', // Using Employee role for Staff/Security
        badges: ['Security']
    });
    await user.save();
    console.log('Security Officer Created: security@campus.com / security123');

    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
