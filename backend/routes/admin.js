const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const passwordController = require('../controllers/passwordController');

const router = express.Router();
router.use(protect, adminOnly);

// Existing routes
router.post('/questions', adminController.addQuestion);
router.get('/questions', adminController.listQuestions);
router.put('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);
router.post('/questions/bulk', adminController.bulkUpload);
router.get('/students', adminController.getStudents);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.get('/sessions', adminController.liveSessions);
router.get('/analytics', adminController.analytics);
router.get('/export', adminController.exportResults);
router.post('/competitions', adminController.createCompetition);

// Daily password management routes
router.post('/daily-password/generate', adminController.generateDailyPassword);
router.get('/daily-password/current', adminController.getCurrentPassword);
router.get('/daily-password/logs', adminController.getPasswordLogs);
router.post('/daily-password/send', passwordController.sendDailyPassword);
router.get('/daily-password/history', passwordController.getPasswordHistory);
router.get('/daily-password/distribution/:passwordId', passwordController.getDistributionStatus);
router.post('/daily-password/test-email', passwordController.testEmailConfiguration);

module.exports = router;router.get('/students', protect, adminOnly, async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' });
    res.json({ success: true, students: students.map(s => s.toObject()) });
  } catch (error) {
    next(error);
  }
});
