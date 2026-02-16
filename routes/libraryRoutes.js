const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public
router.get('/', libraryController.getAllLibraries);

// Protected (Student)
router.get('/my-booking', authMiddleware(['Student']), libraryController.getMyBooking);
router.post('/book', authMiddleware(['Student']), libraryController.bookSlot);
router.post('/cancel', authMiddleware(['Student']), libraryController.cancelSlot);

// Admin Only
router.post('/', authMiddleware(['Admin']), libraryController.createLibrary);
router.delete('/:id', authMiddleware(['Admin']), libraryController.deleteLibrary);

module.exports = router;
