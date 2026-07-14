const Game = require('../models/Game');
const Dictionary = require('../models/Dictionary');
const Leaderboard = require('../models/Leaderboard');
const Syllabus = require('../models/Syllabus');
const CareerGuide = require('../models/CareerGuide');
const PerformanceAnalysis = require('../models/PerformanceAnalysis');
const ExamLock = require('../models/ExamLock');
const courses = require('../config/courses');

// Game Controller
exports.getGames = async (req, res) => {
  try {
    const { subject, type } = req.query;
    const games = await Game.find({ subject, type });
    res.json({ success: true, data: games });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGameById = async (req, res) => {
  try {
    const game = await Game.findOne({ _id: req.params.id });
    res.json({ success: true, data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGame = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const gameData = {
      name: req.body.name,
      type: req.body.type,
      subject: req.body.subject,
      difficulty: req.body.difficulty || 'medium',
      questions: req.body.questions,
      createdBy: req.user.id,
    };

    const game = await Game.create(gameData);
    res.json({ success: true, data: game, message: 'Game created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    await Game.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dictionary Controller
exports.getDictionary = async (req, res) => {
  try {
    const { word, limit = 50 } = req.query;
    const words = await Dictionary.find({ word, limit });
    res.json({ success: true, data: words });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDictionaryWord = async (req, res) => {
  try {
    const word = await Dictionary.findOne({ word: req.params.word });
    if (!word) {
      return res.status(404).json({ success: false, message: 'Word not found' });
    }
    res.json({ success: true, data: word });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchDictionary = async (req, res) => {
  try {
    const { search } = req.query;
    const results = await Dictionary.find({ word: search, limit: 20 });
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Leaderboard Controller
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const leaderboard = await Leaderboard.find({ limit });
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopPerformers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topPerformers = await Leaderboard.getTopPerformers(limit);
    res.json({ success: true, data: topPerformers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserRank = async (req, res) => {
  try {
    const userId = req.user.id;
    const rank = await Leaderboard.getRank(userId);
    res.json({ success: true, data: { rank } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Syllabus Controller
exports.getSyllabuses = async (req, res) => {
  try {
    const { subject, examBody } = req.query;
    const syllabuses = await Syllabus.find({ subject, examBody });
    res.json({ success: true, data: syllabuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSyllabusById = async (req, res) => {
  try {
    const syllabus = await Syllabus.findOne({ _id: req.params.id });
    res.json({ success: true, data: syllabus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSyllabus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const syllabusData = {
      subject: req.body.subject,
      examBody: req.body.examBody,
      topics: req.body.topics,
      content: req.body.content,
      createdBy: req.user.id,
    };

    const syllabus = await Syllabus.create(syllabusData);
    res.json({ success: true, data: syllabus, message: 'Syllabus created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Career Guide Controller
exports.getCareerGuides = async (req, res) => {
  try {
    const { profession, limit = 50 } = req.query;
    const guides = await CareerGuide.find({ profession, limit });
    res.json({ success: true, data: guides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCareerGuideById = async (req, res) => {
  try {
    const guide = await CareerGuide.findOne({ _id: req.params.id });
    res.json({ success: true, data: guide });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchCareerGuides = async (req, res) => {
  try {
    const { search } = req.query;
    const guides = await CareerGuide.find({ profession: search, limit: 20 });
    res.json({ success: true, data: guides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Performance Analysis Controller
exports.getPerformanceAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const analysis = await PerformanceAnalysis.generateAnalysis(userId);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await PerformanceAnalysis.getUserStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Exam Lock Controller
exports.checkExamLock = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.id;

    const lock = await ExamLock.findActive(userId, examId);
    if (lock) {
      return res.json({ success: false, locked: true, lockInfo: lock });
    }

    res.json({ success: true, locked: false });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createExamLock = async (req, res) => {
  try {
    const { examId, subject } = req.body;
    const userId = req.user.id;

    // Check if already locked
    const existingLock = await ExamLock.findActive(userId, examId);
    if (existingLock) {
      return res.status(400).json({ success: false, message: 'Exam already locked' });
    }

    // Create new lock (typically 60 minutes from exam start)
    const lockData = {
      userId,
      examId,
      subject,
      lockedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60, // 60 minutes
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      isActive: 1,
    };

    const lock = await ExamLock.create(lockData);
    res.json({ success: true, data: lock, message: 'Exam locked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.releaseExamLock = async (req, res) => {
  try {
    const { examId } = req.body;
    const userId = req.user.id;

    await ExamLock.deactivate(userId, examId);
    res.json({ success: true, message: 'Exam lock released' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Courses Controller
exports.getCourses = async (req, res) => {
  try {
    const { search } = req.query;

    let filteredCourses = courses;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCourses = courses.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.combinations.some((comb) => comb.toLowerCase().includes(searchLower))
      );
    }

    const coursesWithEnglish = filteredCourses.map((c) => ({
      name: c.name,
      combinations: ['Use of English', ...c.combinations],
    }));

    res.json({ success: true, data: coursesWithEnglish });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
