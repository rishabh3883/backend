const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');
const authMiddleware = require('../middlewares/authMiddleware');

// Staff submits food log
router.post('/', authMiddleware(['Admin', 'Employee']), foodController.submitLog);

// Get History
router.get('/', authMiddleware(['Admin', 'Employee']), foodController.getLogs);

// Update Action (Donate, Compost, Discard)
router.put('/:id/action', authMiddleware(['Admin', 'Employee']), foodController.updateAction);

module.exports = router;
