const express = require('express');
const router = express.Router();
const featuresController = require('../controllers/featuresController');
const { protect } = require('../middleware/auth');

// Games routes
router.get('/games', protect, featuresController.getGames);
router.get('/games/:id', protect, featuresController.getGameById);
router.post('/games', protect, featuresController.createGame);
router.delete('/games/:id', protect, featuresController.deleteGame);

// Dictionary routes
router.get('/dictionary', protect, featuresController.getDictionary);
router.get('/dictionary/search', protect, featuresController.searchDictionary);
router.get('/dictionary/word/:word', protect, featuresController.getDictionaryWord);

// Leaderboard routes
router.get('/leaderboard', protect, featuresController.getLeaderboard);
router.get('/leaderboard/top', protect, featuresController.getTopPerformers);
router.get('/leaderboard/rank', protect, featuresController.getUserRank);

// Syllabus routes
router.get('/syllabuses', protect, featuresController.getSyllabuses);
router.get('/syllabuses/:id', protect, featuresController.getSyllabusById);
router.post('/syllabuses', protect, featuresController.createSyllabus);

// Career Guide routes
router.get('/career-guides', protect, featuresController.getCareerGuides);
router.get('/career-guides/:id', protect, featuresController.getCareerGuideById);
router.get('/career-guides/search', protect, featuresController.searchCareerGuides);

// Performance Analysis routes
router.get('/performance/analysis', protect, featuresController.getPerformanceAnalysis);
router.get('/performance/stats', protect, featuresController.getUserStats);

// Exam Lock routes
router.get('/exam-lock/:examId', protect, featuresController.checkExamLock);
router.post('/exam-lock', protect, featuresController.createExamLock);
router.post('/exam-lock/release', protect, featuresController.releaseExamLock);

// Courses routes
router.get('/courses', protect, featuresController.getCourses);

module.exports = router;
