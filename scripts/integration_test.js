(async () => {
  const base = 'http://localhost:5000';
  const log = (...args) => console.log(...args);

  const fetchJson = async (url, opts={}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return JSON.parse(text); } catch(e) { return { raw: text, status: res.status }; }
  };

  try {
    log('--- Student signup/login ---');
    // Signup student
    let r = await fetchJson(base + '/api/auth/signup', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: 'Test Student', email: 'teststudent@example.com', password: 'testpass' }) });
    log('signup:', r);

    // Login student
    r = await fetchJson(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'teststudent@example.com', password: 'testpass' }) });
    log('login:', r.success ? 'ok' : r);
    if (!r.success) throw new Error('Student login failed');
    const studentToken = r.token;

    // Get subjects
    r = await fetchJson(base + '/api/exams/subjects', { headers: { Authorization: `Bearer ${studentToken}` } });
    log('subjects:', r);
    const subj = (r.subjects && r.subjects.find(s=>s.code==='MATH')) || (r.subjects && r.subjects[0]);
    if (!subj) throw new Error('No subjects available');
    log('Using subject:', subj.name, subj.code);

    // Start exam
    r = await fetchJson(base + '/api/exams/start', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ subjectCode: subj.code }) });
    log('startExam:', r);
    if (!r.success && r.message && r.message.includes('active exam lock')) {
      log('Active exam lock detected, attempting to release...');
      await fetchJson(base + '/api/features/exam-lock/release', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ examId: subj.id }) });
      // retry start
      r = await fetchJson(base + '/api/exams/start', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ subjectCode: subj.code }) });
      log('startExam retry:', r);
    }
    if (!r.success) throw new Error('Start exam failed');
    const sessionId = r.sessionId;

    // Get session (with questions)
    r = await fetchJson(base + '/api/exams/session/' + sessionId, { headers: { Authorization: `Bearer ${studentToken}` } });
    log('session response:', r);
    const sessionObj = r.session;
    const questions = sessionObj.questions;
    if (!questions || questions.length === 0) throw new Error('No questions in session');

    // Submit answer for first question
    const q0 = questions[0];
    log('Submitting answer for question id', q0.id || q0);
    const answer = (q0.choices && q0.choices[0]) || 'N/A';
    r = await fetchJson(base + '/api/exams/answer', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ sessionId, questionId: q0.id, answer }) });
    log('submitAnswer:', r);

    // Finish exam
    r = await fetchJson(base + '/api/exams/finish', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ sessionId }) });
    log('finishExam:', r);

    // Admin login
    log('--- Admin login & add question ---');
    r = await fetchJson(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'admin@example.com', password: 'admin123', adminCode: 'ADMIN2010' }) });
    log('admin login:', r.success ? 'ok' : r);
    if (!r.success) throw new Error('Admin login failed');
    const adminToken = r.token;

    // Add question
    const newQ = { subject: 'Mathematics', questionText: 'Integration test: 1+1=?', choices: ['1','2','3','4'], answer: '2' };
    r = await fetchJson(base + '/api/admin/questions', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify(newQ) });
    log('addQuestion:', r);

    // List questions
    r = await fetchJson(base + '/api/admin/questions', { headers: { Authorization: `Bearer ${adminToken}` } });
    log('listQuestions count:', r.success ? r.questions.length : r);

    log('\nIntegration test finished successfully');
    process.exit(0);
  } catch (err) {
    console.error('Integration test error:', err);
    process.exit(1);
  }
})();
