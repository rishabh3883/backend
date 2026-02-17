const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/multer');

// Student creates complaint with image
router.post('/', authMiddleware(['Student']), upload.single('image'), complaintController.createComplaint);

// List complaints (Student sees own, Admin/Employee see all)
router.get('/', authMiddleware(['Student', 'Admin', 'Employee']), complaintController.getComplaints);

// Update status (Admin/Employee, Student for Verification)
router.put('/:id/status', authMiddleware(['Admin', 'Employee', 'Student']), complaintController.updateComplaintStatus);

// Staff accepts task
router.post('/:id/assign', authMiddleware(['Employee', 'Admin']), complaintController.assignComplaint);

// Student Escalates
router.post('/:id/escalate', authMiddleware(['Student']), complaintController.escalateComplaint);

// Add Message (Chat)
router.post('/:id/message', authMiddleware(['Student', 'Admin', 'Employee']), complaintController.addMessage);

module.exports = router;
