const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public
router.get('/', eventController.getAllEvents);

// Protected (Admin)
router.post('/', authMiddleware(['Admin']), eventController.createEvent);
router.get('/:eventId/attendees', authMiddleware(['Admin']), eventController.getEventAttendees);

// Protected (Student/Staff)
router.post('/book', authMiddleware(['Student', 'Employee', 'Admin', 'Security']), eventController.bookEvent);
router.get('/my-bookings', authMiddleware(['Student', 'Employee', 'Admin', 'Security']), eventController.getMyBookings);

module.exports = router;
