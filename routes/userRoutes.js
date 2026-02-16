const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require Admin role
router.use(authMiddleware(['Admin']));

router.get('/pending', authMiddleware(['Admin']), userController.getPendingUsers);
router.get('/', authMiddleware(['Admin']), userController.getUsers); // List all users
router.get('/stats', authMiddleware(['Admin']), userController.getUserStats);
router.put('/:userId/status', authMiddleware(['Admin']), userController.updateUserStatus);
router.put('/:userId/access', authMiddleware(['Admin']), userController.manageUserAccess); // Block/Unblock

module.exports = router;
