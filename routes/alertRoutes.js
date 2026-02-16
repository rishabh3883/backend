const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware(['Admin']), alertController.getAlerts);

module.exports = router;
