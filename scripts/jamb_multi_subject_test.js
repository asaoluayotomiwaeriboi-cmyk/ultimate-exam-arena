(async () => {
  const base = 'http://localhost:5000';
  const log = (...args) => console.log(...args);
  const fetchJson = async (url, opts={}) => { const res = await fetch(url, opts); const text = await res.text(); try { return JSON.parse(text); } catch(e) { return { raw: text, status: res.status }; } };
  try {
    log('--- Student login ---');
    let r = await fetchJson(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'teststudent@example.com', password: 'testpass' }) });
    log('student login:', r.success ? 'ok' : r);
    if (!r.success) throw new Error('Student login failed');
    const token = r.token;

    // Start multi-subject JAMB-style exam
    const subjectCodes = ['USE_OF_ENGLISH','MATH','PHY','CHEM'];
    log('Starting multi-subject JAMB exam with:', subjectCodes.join(', '));
    r = await fetchJson(base + '/api/exams/start', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subjectCodes }) });
    log('startExam:', r);
    if (!r.success) throw new Error('Start exam failed');

    const sessionId = r.sessionId;
    r = await fetchJson(base + '/api/exams/session/' + sessionId, { headers: { Authorization: `Bearer ${token}` } });
    log('session response:', r);

    log('\nMulti-subject JAMB test completed');
    process.exit(0);
  } catch (err) {
    console.error('JAMB multi test error:', err);
    process.exit(1);
  }
})();
