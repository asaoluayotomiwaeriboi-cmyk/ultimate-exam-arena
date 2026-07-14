const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getSubjects,
  startExam,
  getSession,
  submitAnswer,
  finishExam,
} = require('../controllers/examController');
const {
  verifyCompetitivePassword,
  getPasswordStatus,
  getUserPasswordHistory,
} = require('../controllers/examPasswordController');

const router = express.Router();
router.get('/subjects', protect, getSubjects);
router.post('/start', protect, startExam);
router.get('/session/:sessionId', protect, getSession);
router.post('/answer', protect, submitAnswer);
router.post('/finish', protect, finishExam);

// UTME competitive exam password verification routes
router.post('/verify-competitive-password', protect, verifyCompetitivePassword);
router.get('/password-status', protect, getPasswordStatus);
router.get('/password-history', protect, getUserPasswordHistory);

module.exports = router;
