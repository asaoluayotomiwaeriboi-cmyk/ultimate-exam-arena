const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const { randomUUID } = require('crypto');
const ExamSession = require('../models/ExamSession');
const Result = require('../models/Result');

exports.addQuestion = async (req, res, next) => {
  try {
    const question = await Question.create(req.body);
    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Question removed' });
  } catch (error) {
    next(error);
  }
};

exports.listQuestions = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.subject) filters.subject = req.query.subject;
    filters.sort = '-createdAt';
    filters.limit = 150;
    const questions = await Question.find(filters);
    res.json({ success: true, questions });
  } catch (error) {
    next(error);
  }
};

exports.bulkUpload = async (req, res, next) => {
  try {
    const items = req.body.questions || [];
    const prepared = items.map((item) => ({
      subject: item.subject,
      questionText: item.questionText,
      choices: item.choices,
      answer: item.answer,
    }));
    await Question.insertMany(prepared);
    res.json({ success: true, count: prepared.length });
  } catch (error) {
    next(error);
  }
};

exports.getStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' });
    const result = students.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));
    res.json({ success: true, students: result });
  } catch (error) {
    next(error);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const subject = await Subject.create(req.body);
    res.json({ success: true, subject });
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.updateById(req.params.id, req.body);
    res.json({ success: true, subject });
  } catch (error) {
    next(error);
  }
};

exports.liveSessions = async (req, res, next) => {
  try {
    const sessions = await ExamSession.findActiveSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
};

exports.analytics = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalQuestions = await Question.countDocuments();
    const totalExams = await Result.countDocuments();
    const topSubjects = await Result.getTopSubjects(6);
    res.json({ success: true, stats: { totalStudents, totalQuestions, totalExams, topSubjects } });
  } catch (error) {
    next(error);
  }
};

exports.exportResults = async (_req, res, next) => {
  try {
    const results = await Result.findWithStudent();
    const csv = [
      'Student Name,Email,Subject,Score,Total Questions,Finished At',
      ...results.map(
        (item) =>
          `${item.studentName || 'Unknown'},${item.studentEmail || 'N/A'},${item.subject},${item.score},${item.totalQuestions},${new Date(item.finishedAt * 1000).toISOString()}`
      ),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=cbt-results.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.createCompetition = async (req, res, next) => {
  try {
    const { subjectCode, durationMinutes } = req.body;
    const subject = await Subject.findOne({ code: subjectCode });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    const lockedAt = Math.floor(Date.now() / 1000);
    const expiresAt = lockedAt + (durationMinutes || subject.duration) * 60;

    const ExamLock = require('../models/ExamLock');
    // Use a standardized competition display name for JAMB/UTME
    const competitionName =
      subject.code && subject.code.includes('JAMB') ? 'JAMB/UTME Mock challange' : subject.name;

    const lock = await ExamLock.create({
      userId: 0,
      examId: subject.id,
      subject: competitionName,
      lockedAt,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'admin',
      isActive: 1,
    });

    res.json({ success: true, lock });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a daily password for JAMB Mock Challenge
 */
exports.generateDailyPassword = async (req, res, next) => {
  try {
    const { durationHours = 24, examType = 'UTME' } = req.body;
    const adminId = req.user.id;

    // Generate a random 6-digit password
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    const bcryptjs = require('bcryptjs');
    const passwordHash = bcryptjs.hashSync(password, 10);
    const db = require('../config/db');
    const { randomUUID } = require('crypto');

    const passwordId = randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);
    const expiresAt = createdAt + durationHours * 3600;

    return new Promise((resolve) => {
      db.run(
        `
        INSERT INTO daily_exam_passwords 
        (id, examType, password, passwordHash, createdAt, expiresAt, isActive, generatedBy)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `,
        [passwordId, examType, password, passwordHash, createdAt, expiresAt, adminId],
        (err) => {
          if (err) {
            console.error('Error generating password:', err);
            return resolve(
              res.status(500).json({
                success: false,
                message: 'Failed to generate password',
              })
            );
          }

          resolve(
            res.json({
              success: true,
              message: 'Password generated successfully',
              passwordId,
              password,
              expiresAt: new Date(expiresAt * 1000).toISOString(),
              validFor: `${durationHours} hours`,
            })
          );
        }
      );
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current active password (for admin panel display)
 */
exports.getCurrentPassword = async (req, res, next) => {
  try {
    const db = require('../config/db');
    const now = Math.floor(Date.now() / 1000);

    return new Promise((resolve) => {
      db.get(
        `
        SELECT id, examType, createdAt, expiresAt, isActive 
        FROM daily_exam_passwords 
        WHERE examType = 'UTME' AND isActive = 1 AND expiresAt > ?
        ORDER BY createdAt DESC LIMIT 1
      `,
        [now],
        (err, row) => {
          if (err) {
            console.error('Error fetching current password:', err);
            return resolve(
              res.status(500).json({
                success: false,
                message: 'Error fetching password',
              })
            );
          }

          if (!row) {
            return resolve(
              res.json({
                success: true,
                hasActivePassword: false,
                message: 'No active password',
              })
            );
          }

          const timeRemaining = row.expiresAt - now;
          const hoursRemaining = Math.floor(timeRemaining / 3600);
          const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);

          resolve(
            res.json({
              success: true,
              hasActivePassword: true,
              passwordId: row.id,
              expiresAt: new Date(row.expiresAt * 1000).toISOString(),
              timeRemaining: {
                total: timeRemaining,
                hours: hoursRemaining,
                minutes: minutesRemaining,
                formatted: `${hoursRemaining}h ${minutesRemaining}m`,
              },
            })
          );
        }
      );
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: list password verification logs (recent)
 */
exports.getPasswordLogs = async (req, res, next) => {
  try {
    const db = require('../config/db');
    const limit = parseInt(req.query.limit, 10) || 200;
    const sql = `
      SELECT pvl.id, pvl.userId, u.name as userName, u.email as userEmail, pvl.passwordId, pvl.isCorrect, pvl.ipAddress, pvl.userAgent, pvl.attemptedAt
      FROM password_verification_logs pvl
      LEFT JOIN users u ON pvl.userId = u.id
      ORDER BY pvl.attemptedAt DESC
      LIMIT ?
    `;
    db.all(sql, [limit], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch logs' });
      res.json({ success: true, logs: rows });
    });
  } catch (error) {
    next(error);
  }
};
