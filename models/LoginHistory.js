const mongoose = require('mongoose');

const LoginHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    loginTime: { type: Date, default: Date.now },
    ipAddress: { type: String },
    device: { type: String }, // User Agent
    status: { type: String, enum: ['Success', 'Failed'], default: 'Success' }
});

module.exports = mongoose.model('LoginHistory', LoginHistorySchema);
