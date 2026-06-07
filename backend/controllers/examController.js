const Question = require('../models/Question');
const ExamSession = require('../models/ExamSession');
const Result = require('../models/Result');
const Subject = require('../models/Subject');
const ExamLock = require('../models/ExamLock');
const db = require('../config/db');

const shuffleArray = (array) => array.sort(() => 0.5 - Math.random());

exports.getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ active: true });
    res.json({ success: true, subjects });
  } catch (error) {
    next(error);
  }
};

exports.startExam = async (req, res, next) => {
  try {
    const { subjectCode, subjectCodes } = req.body;

    // Support single-subject start (subjectCode) or multi-subject JAMB-style start (subjectCodes array)
    let subjectsToUse = [];
    if (Array.isArray(subjectCodes) && subjectCodes.length > 0) {
      for (const code of subjectCodes) {
        const s = await Subject.findOne({ code, active: true });
        if (s) subjectsToUse.push(s);
      }
      if (!subjectsToUse.length) return res.status(404).json({ success: false, message: 'No valid subjects found for provided codes' });
    } else if (subjectCode) {
      const subject = await Subject.findOne({ code: subjectCode, active: true });
      if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
      subjectsToUse = [subject];
    } else {
      return res.status(400).json({ success: false, message: 'subjectCode or subjectCodes is required' });
    }

    // Check for active personal exam lock (use first selected subject as key)
    const examLock = await ExamLock.findActive(req.user.id, subjectsToUse[0].id);
    if (examLock) {
      return res.status(403).json({ 
        success: false, 
        message: 'You have an active exam lock for this subject. Please wait before attempting again.',
        expiresAt: examLock.expiresAt
      });
    }

    // If this request is for a mock/competitive session, require password verification
    const isMock = req.body.mode === 'mock' || req.body.mock === true || req.body.examType === 'UTME';
    if (isMock) {
      const db = require('../config/db');
      const now = Math.floor(Date.now() / 1000);
      // find active daily password
      const currentPwd = await new Promise((resolve) => {
        db.get(`SELECT * FROM daily_exam_passwords WHERE examType = 'UTME' AND isActive = 1 AND expiresAt > ? ORDER BY createdAt DESC LIMIT 1`, [now], (err, row) => {
          if (err) return resolve(null);
          resolve(row || null);
        });
      });

      if (!currentPwd) {
        return res.status(403).json({ success: false, message: 'Mock access is not available at this time.' });
      }

      // Ensure user has a successful verification log for this password
      const verified = await new Promise((resolve) => {
        db.get(`SELECT COUNT(*) as c FROM password_verification_logs WHERE userId = ? AND passwordId = ? AND isCorrect = 1`, [req.user.id, currentPwd.id], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.c > 0);
        });
      });

      if (!verified) {
        return res.status(403).json({ success: false, message: 'You must verify today\'s mock password before starting this exam.' });
      }
    }

    // Check for an active global competition lock for this subject. If present,
    // allow students to join the competition without creating a personal lock.
    const globalLock = await ExamLock.findGlobal(subjectsToUse[0].id);

    // Build question pool: include selected subjects' question banks.
    // For JAMB-style exams, ensure USE OF ENGLISH is included once.
    const questionsToFetch = new Set();
    for (const s of subjectsToUse) questionsToFetch.add(s.name);
    const isJambStyle = subjectsToUse.some(s => s.code === 'UTME' || (s.code && s.code.includes('JAMB')));
    if (isJambStyle) {
      questionsToFetch.add('USE OF ENGLISH');
    }

    // Fetch question IDs per subject and allocate quota per subject.
    const questionIdsBySubject = new Map();
    for (const subjectName of Array.from(questionsToFetch)) {
      const ids = await new Promise((resolve) => {
        db.all('SELECT id FROM questions WHERE subject = ?', [subjectName], (err, rows) => {
          if (err) return resolve([]);
          resolve(rows.map(r => r.id));
        });
      });
      questionIdsBySubject.set(subjectName, shuffleArray(ids));
    }

    const totalQuestionsWanted = 40;
    const selectedIds = [];
    const subjectNames = Array.from(questionIdsBySubject.keys());

    if (!subjectNames.length) {
      return res.status(404).json({ success: false, message: 'No questions available for this exam.' });
    }

    const quota = {};
    if (isJambStyle && questionIdsBySubject.has('USE OF ENGLISH')) {
      quota['USE OF ENGLISH'] = 10;
      const remainingSubjects = subjectNames.filter((name) => name !== 'USE OF ENGLISH');
      const remainingCount = totalQuestionsWanted - quota['USE OF ENGLISH'];
      const perSubject = Math.max(1, Math.floor(remainingCount / Math.max(1, remainingSubjects.length)));
      remainingSubjects.forEach((name, index) => {
        quota[name] = index === remainingSubjects.length - 1
          ? remainingCount - perSubject * (remainingSubjects.length - 1)
          : perSubject;
      });
    } else {
      const perSubject = Math.max(1, Math.floor(totalQuestionsWanted / subjectNames.length));
      subjectNames.forEach((name, index) => {
        quota[name] = index === subjectNames.length - 1
          ? totalQuestionsWanted - perSubject * (subjectNames.length - 1)
          : perSubject;
      });
    }

    for (const subjectName of subjectNames) {
      const ids = questionIdsBySubject.get(subjectName) || [];
      const count = Math.min(quota[subjectName] || 0, ids.length);
      selectedIds.push(...ids.slice(0, count));
    }

    // If we still need more questions, fill from remaining questions across subjects.
    const needed = totalQuestionsWanted - selectedIds.length;
    if (needed > 0) {
      const remainingIds = [];
      for (const subjectName of subjectNames) {
        const ids = questionIdsBySubject.get(subjectName) || [];
        remainingIds.push(...ids.slice(quota[subjectName] || 0));
      }
      selectedIds.push(...remainingIds.slice(0, needed));
    }

    if (!selectedIds.length) {
      return res.status(404).json({ success: false, message: 'No questions available for this exam.' });
    }

    const questionSet = await Question.findByIds(selectedIds);

    // Create personal exam lock only if there is no global competition lock
    if (!globalLock) {
      // Use the first subject's duration as default lock duration
      const baseDuration = subjectsToUse[0].duration || 60;
      const lockDuration = baseDuration + 30; // buffer
      const lockExpiresAt = Math.floor(Date.now() / 1000) + (lockDuration * 60);

      await ExamLock.create({
        userId: req.user.id,
        examId: subjectsToUse[0].id,
        subject: subjectsToUse[0].name,
        lockedAt: Math.floor(Date.now() / 1000),
        expiresAt: lockExpiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        isActive: 1
      });
    }

    // If joining a global competition, use the competition's display name and
    // align the session expiry with the global lock expiry so all participants
    // share the same timer.
    const sessionSubject = globalLock ? globalLock.subject : (subjectsToUse.map(s=>s.name).join(' + '));
    const sessionExpiresAt = globalLock ? new Date(globalLock.expiresAt * 1000) : new Date(Date.now() + (subjectsToUse[0].duration || 60) * 60000);

    const session = await ExamSession.create({
      student: req.user.id,
      subject: sessionSubject,
      questions: questionSet.map((q) => q.id),
      expiresAt: sessionExpiresAt,
    });

    const durationMinutes = Math.max(1, Math.round((sessionExpiresAt.getTime() - Date.now()) / 60000));

    res.json({ 
      success: true, 
      sessionId: session.id, 
      subjects: subjectsToUse.map(s => ({ id: s.id, name: s.name, code: s.code, duration: s.duration })),
      duration: durationMinutes,
      expiresAt: sessionExpiresAt.toISOString(),
      message: 'Exam started successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId);
    if (!session || Number(session.student) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    await session.populate('questions');
    const hasExpired = session.expiresAt && Date.now() / 1000 > session.expiresAt;
    res.json({ success: true, session, expired: hasExpired });
  } catch (error) {
    next(error);
  }
};

exports.submitAnswer = async (req, res, next) => {
  try {
    const { sessionId, questionId, answer } = req.body;
    const session = await ExamSession.findById(sessionId);
    if (!session || Number(session.student) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.finished) {
      return res.status(400).json({ success: false, message: 'Exam already finished' });
    }
    const existing = session.answers.find((item) => String(item.questionId) === String(questionId));
    if (existing) existing.answer = answer;
    else session.answers.push({ questionId, answer });
    await session.save();
    res.json({ success: true, answers: session.answers });
  } catch (error) {
    next(error);
  }
};

exports.finishExam = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = await ExamSession.findById(sessionId);
    if (!session || Number(session.student) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.finished) {
      return res.status(400).json({ success: false, message: 'Exam already finished' });
    }

    await session.populate('questions');

    const questionMap = new Map(session.questions.map((q) => [String(q.id), q]));

    // Tally per-subject totals and correct answers
    const perSubjectTotals = {};
    const perSubjectCorrect = {};
    session.questions.forEach((q) => {
      perSubjectTotals[q.subject] = (perSubjectTotals[q.subject] || 0) + 1;
    });

    session.answers.forEach((item) => {
      const question = questionMap.get(String(item.questionId));
      if (!question) return;
      perSubjectCorrect[question.subject] = (perSubjectCorrect[question.subject] || 0) + (item.answer === question.answer ? 1 : 0);
    });

    // Build per-subject breakdown
    const perSubjectScores = Object.keys(perSubjectTotals).map((subj) => {
      const total = perSubjectTotals[subj] || 0;
      const correct = perSubjectCorrect[subj] || 0;
      const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
      return { subject: subj, correct, total, percent };
    });

    const totalCorrect = Object.values(perSubjectCorrect).reduce((a, b) => a + b, 0);
    const totalQuestions = session.questions.length;
    const totalPercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // JAMB-style aggregate score out of 400 (map percent -> 0..400)
    const jambScoreOutOf400 = Math.round((totalPercent / 100) * 400);

    // Determine exam body tag
    let examTag = session.subject;
    if (session.subject.includes('JAMB') || session.subject.includes('UTME')) {
      examTag = 'JAMB/UTME Mock challange';
    }

    session.score = totalCorrect;
    session.finished = true;
    await session.save();

    // Release any personal exam locks for this user
    const activeLocks = await ExamLock.find({ userId: req.user.id, isActive: 1 });
    for (const l of activeLocks) {
      await ExamLock.deactivate(req.user.id, l.examId);
    }

    const result = await Result.create({
      student: req.user.id,
      subject: examTag,
      score: totalCorrect,
      totalQuestions,
      answers: session.answers,
      startedAt: session.startedAt,
      finishedAt: Math.floor(Date.now() / 1000),
    });

    res.json({ success: true, result, perSubjectScores, totalPercent, jambScoreOutOf400, examTag });
  } catch (error) {
    next(error);
  }
};
