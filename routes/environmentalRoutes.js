const express = require('express');
const router = express.Router();
const envController = require('../controllers/environmentalController');
const authMiddleware = require('../middlewares/authMiddleware');

// Admin triggers AI analysis
router.post('/observe', authMiddleware(['Admin']), envController.observeAndSuggest);

// Get tasks (Admin sees all, Staff sees published)
router.get('/tasks', authMiddleware(['Admin', 'Employee']), envController.getTasks);

// Update status (Admin publishes, Staff completes)
router.put('/tasks/:id', authMiddleware(['Admin', 'Employee']), envController.updateTaskStatus);

module.exports = router;
