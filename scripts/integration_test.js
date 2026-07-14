(async () => {
  const base = 'http://localhost:5000';
  const log = (...args) => console.log(...args);

  const fetchJson = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { raw: text, status: res.status };
    }
  };

  try {
    log('--- Ensure test data (student + subjects) ---');
    // Create a test student directly in the database (API signup has mismatched schema)
    const db = require('../backend/config/db');
    const bcrypt = require('bcryptjs');
    const testEmail = 'teststudent@example.com';
    const testPassword = 'testpass';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'UEA@Admin2025#Secure';

    const existing = await db.get('SELECT id, email FROM users WHERE email = ?', [testEmail]);
    if (!existing) {
      const hashed = await bcrypt.hash(testPassword, 10);
      await db.run('INSERT INTO users (name, email, password, role, profile) VALUES (?, ?, ?, ?, ?)', [
        'Test Student',
        testEmail,
        hashed,
        'student',
        JSON.stringify({}),
      ]);
      log('Inserted test student into DB');
    } else {
      log('Test student already exists');
    }

    log('--- Student login ---');
    // Login student
    let r = await fetchJson(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teststudent@example.com', password: 'testpass' }),
    });
    log('login:', r.success ? 'ok' : r);

    // Login student (second time to ensure session)
    r = await fetchJson(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teststudent@example.com', password: 'testpass' }),
    });
    log('login:', r.success ? 'ok' : r);
    if (!r.success) throw new Error('Student login failed');
    const studentToken = r.token;

    // Get subjects
    r = await fetchJson(base + '/api/exams/subjects', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    log('subjects:', r);
    const subj = (r.subjects && r.subjects.find((s) => s.code === 'MATH')) || (r.subjects && r.subjects[0]);
    if (!subj) throw new Error('No subjects available');
    log('Using subject:', subj.name, subj.code);

    // Ensure at least one question exists for the subject (model-level check)

    // Ensure at least one question exists for the subject (model-level check)
    const Question = require('../backend/models/Question');
    const qCount = await Question.countDocuments({ subject: subj.name });
    log('Existing question count for', subj.name, qCount);
    if (Number(qCount) === 0) {
      try {
        await Question.create({ subject: subj.name, questionText: 'What is 1+1?', choices: ['1', '2', '3', '4'], answer: '2' });
        log('Inserted sample question for subject', subj.name);
      } catch (e) {
        console.error('Question.create failed:', e.message || e);
      }
    }

    // Start exam
    r = await fetchJson(base + '/api/exams/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ subjectCode: subj.code }),
    });
    log('startExam:', r);
    if (!r.success && r.message && r.message.includes('active exam lock')) {
      log('Active exam lock detected, attempting to release...');
      await fetchJson(base + '/api/features/exam-lock/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ examId: subj.id }),
      });
      // retry start
      r = await fetchJson(base + '/api/exams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ subjectCode: subj.code }),
      });
      log('startExam retry:', r);
    }
    if (!r.success) throw new Error('Start exam failed');
    const sessionId = r.sessionId;

    // Get session (with questions)
    r = await fetchJson(base + '/api/exams/session/' + sessionId, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    log('session response:', r);
    const sessionObj = r.session;
    const questions = sessionObj.questions;
    if (!questions || questions.length === 0) throw new Error('No questions in session');

    // Submit answer for first question
    const q0 = questions[0];
    log('Submitting answer for question id', q0.id || q0);
    const answer = (q0.choices && q0.choices[0]) || 'N/A';
    r = await fetchJson(base + '/api/exams/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ sessionId, questionId: q0.id, answer }),
    });
    log('submitAnswer:', r);

    // Finish exam
    r = await fetchJson(base + '/api/exams/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ sessionId }),
    });
    log('finishExam:', r);

    // Admin login
    log('--- Admin login & add question ---');
    if (!process.env.ADMIN_PASSWORD) console.warn('Using fallback admin password in integration_test.js — set ADMIN_PASSWORD env for tests.');
    r = await fetchJson(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: ADMIN_PASSWORD,
        adminCode: 'ADMIN2010',
      }),
    });
    log('admin login:', r.success ? 'ok' : r);
    if (!r.success) throw new Error('Admin login failed');
    adminToken = r.token;

    // Add question
    const newQ = {
      subject: 'Mathematics',
      questionText: 'Integration test: 1+1=?',
      choices: ['1', '2', '3', '4'],
      answer: '2',
    };
    r = await fetchJson(base + '/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(newQ),
    });
    log('addQuestion:', r);

    // List questions
    r = await fetchJson(base + '/api/admin/questions', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    log('listQuestions count:', r.success ? r.questions.length : r);

    log('\nIntegration test finished successfully');
    process.exit(0);
  } catch (err) {
    console.error('Integration test error:', err);
    process.exit(1);
  }
})();
