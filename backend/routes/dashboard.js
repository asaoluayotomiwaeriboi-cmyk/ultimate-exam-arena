const express = require('express');
const { protect } = require('../middleware/auth');
const { studentOverview } = require('../controllers/dashboardController');

const router = express.Router();
router.get('/overview', protect, studentOverview);
module.exports = router;
