const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/multer');

// Employee uploads Excel
router.post('/upload', authMiddleware(['Admin', 'Employee']), upload.single('file'), resourceController.uploadExcel);

// Employee manual entry
router.post('/daily-log', authMiddleware(['Admin', 'Employee']), resourceController.submitDailyLog);

// Admin Log Approval
router.get('/pending-logs', authMiddleware(['Admin']), resourceController.getPendingLogs);
router.post('/approve-log', authMiddleware(['Admin']), resourceController.approveLog);

// Get Hostels list
router.get('/stats', authMiddleware(['Admin', 'Employee']), resourceController.getDashboardStats);
router.get('/hostels', authMiddleware(['Admin', 'Employee']), resourceController.getHostels);

// Employee view recent logs
router.get('/my-logs', authMiddleware(['Admin', 'Employee']), resourceController.getMyLogs);

// Admin views analytics
router.get('/analytics', authMiddleware(['Admin']), resourceController.getAnalytics);

// Excel Export
router.get('/export', authMiddleware(['Admin']), resourceController.downloadReport);

// Add/Delete Hostel (Admin)
router.post('/hostels', authMiddleware(['Admin']), resourceController.addHostel);
router.delete('/hostels/:id', authMiddleware(['Admin']), resourceController.deleteHostel);

module.exports = router;
