const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const authMiddleware = require('../middlewares/authMiddleware');
router.post('/register', authController.register);
router.post('/signup', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware(['Student', 'Admin', 'Employee']), authController.getMe);

module.exports = router;
