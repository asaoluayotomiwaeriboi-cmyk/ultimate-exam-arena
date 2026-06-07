(async () => {
  const base = 'http://localhost:5000';
  const log = (...args) => console.log(...args);
  const fetchJson = async (url, opts={}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return JSON.parse(text); } catch(e) { return { raw: text, status: res.status }; }
  };

  try {
    log('--- Admin login ---');
    let r = await fetchJson(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'admin@example.com', password: 'admin123', adminCode: 'ADMIN2010' }) });
    log('admin login:', r.success ? 'ok' : r);
    if (!r.success) throw new Error('Admin login failed');
    const adminToken = r.token;

    // Create competition lock for JAMB
    log('Creating competition lock for JAMB...');
    r = await fetchJson(base + '/api/admin/competitions', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ subjectCode: 'JAMB', durationMinutes: 30 }) });
    log('createCompetition:', r);
    if (!r.success) throw new Error('Failed to create competition lock');

    // Student login
    log('--- Student signup/login ---');
    r = await fetchJson(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'teststudent@example.com', password: 'testpass' }) });
    log('student login:', r.success ? 'ok' : r);
    if (!r.success) throw new Error('Student login failed');
    const studentToken = r.token;

    // Start JAMB exam as student
    log('Starting JAMB exam as student...');
    r = await fetchJson(base + '/api/exams/start', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ subjectCode: 'JAMB' }) });
    log('startExam:', r);
    if (!r.success) throw new Error('Start exam failed');
    const sessionId = r.sessionId;

    // Get session
    r = await fetchJson(base + '/api/exams/session/' + sessionId, { headers: { Authorization: `Bearer ${studentToken}` } });
    log('session response:', r);

    // Finish quickly
    const questions = r.session.questions;
    if (questions && questions.length) {
      const q0 = questions[0];
      await fetchJson(base + '/api/exams/answer', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ sessionId, questionId: q0.id, answer: (q0.choices && q0.choices[0]) || 'N/A' }) });
    }
    r = await fetchJson(base + '/api/exams/finish', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ sessionId }) });
    log('finishExam:', r);

    log('\nJAMB competition flow test completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('JAMB test error:', err);
    process.exit(1);
  }
})();
