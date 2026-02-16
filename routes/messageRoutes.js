const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware(['Admin']), messageController.sendMessage);
router.get('/', authMiddleware(['Admin', 'Employee', 'Student']), messageController.getMessages);

module.exports = router;
