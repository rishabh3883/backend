const express = require('express');
const router = express.Router();
const { getInsights } = require('../controllers/insightController');

router.get('/', getInsights);

module.exports = router;
