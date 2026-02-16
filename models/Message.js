const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverRole: { type: String, enum: ['All', 'Staff', 'Student'], default: 'Staff' }, // Broadcast or targeted
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', MessageSchema);
