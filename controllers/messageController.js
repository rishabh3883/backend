const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
    try {
        const { content, receiverRole } = req.body;
        const message = new Message({
            senderId: req.user.id,
            receiverRole,
            content
        });
        await message.save();
        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        // Fetch messages relevant to the user's role
        // Provide 'All' + strict Role matching
        const role = req.user.role === 'Employee' ? 'Staff' : req.user.role;

        const messages = await Message.find({
            receiverRole: { $in: ['All', role] }
        }).sort({ date: -1 }).limit(20).populate('senderId', 'name');

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
