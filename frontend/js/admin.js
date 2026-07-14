const token = localStorage.getItem('cbt_token');
if (!token) window.location.href = '/login.html';
const request = async (path, options = {}) => {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, ...options });
  const data = await res.json();
  if (!data.success) window.location.href = '/login.html';
  return data;
};

const analyticsSummary = document.querySelector('#analytics-summary');
const liveSessionsContainer = document.querySelector('#live-sessions');
const questionTable = document.querySelector('#question-table');
const subjectForm = document.querySelector('#subject-form');
const questionForm = document.querySelector('#question-form');
const refreshQuestions = document.querySelector('#refresh-questions');
const logoutButton = document.querySelector('.logout-btn');
const darkToggle = document.querySelector('#dark-toggle');
const threatIndicator = document.querySelector('#threat-indicator');
const securityInsights = document.querySelector('#security-insights');
const setupMFA = document.querySelector('#setup-mfa');
const mfaQR = document.querySelector('#mfa-qr');
const mfaCode = document.querySelector('#mfa-code');
const enableMFA = document.querySelector('#enable-mfa');
const ipWhitelist = document.querySelector('#ip-whitelist');
const updateIPs = document.querySelector('#update-ips');

let currentThreatLevel = 0;

const applyThreatTheme = (level) => {
  document.body.className = `threat-${['low', 'medium', 'high'][level]}`;
  threatIndicator.textContent = `Security: ${['Low', 'Medium', 'High'][level]}`;
  threatIndicator.className = `badge ${level === 2 ? 'error' : level === 1 ? 'warning' : 'success'}`;
};

const generateInsights = (stats, sessions) => {
  const insights = [];
  if (stats.totalExams > 100) {
    insights.push({
      title: 'High Activity Detected',
      message: 'Exam volume is high. Consider scaling resources.',
      action: 'Monitor server performance',
      type: 'info',
    });
  }
  if (sessions.length > 5) {
    insights.push({
      title: 'Multiple Active Sessions',
      message: `${sessions.length} students currently taking exams.`,
      action: 'Ensure system stability',
      type: 'warning',
    });
  }
  if (currentThreatLevel > 0) {
    insights.push({
      title: 'Security Alert',
      message: 'Threat level elevated. Review recent login attempts.',
      action: 'Check security logs',
      type: 'error',
    });
  }
  return insights;
};

const loadAnalytics = async () => {
  const data = await request('/api/admin/analytics');
  analyticsSummary.textContent = `Students: ${data.stats.totalStudents}, Questions: ${data.stats.totalQuestions}, Exams taken: ${data.stats.totalExams}`;
};

const loadSessions = async () => {
  const data = await request('/api/admin/sessions');
  if (!data.success) return;
  liveSessionsContainer.innerHTML = '';
  if (data.sessions.length) {
    data.sessions.forEach((session) => {
      const card = document.createElement('div');
      card.className = 'feature-card';
      const strong = document.createElement('strong');
      strong.textContent = session.student?.name || 'Unknown';
      card.appendChild(strong);
      card.appendChild(document.createElement('br'));
      const meta = document.createTextNode(
        `${session.subject} • Started ${new Date(session.startedAt).toLocaleTimeString()}`
      );
      card.appendChild(meta);
      liveSessionsContainer.appendChild(card);
    });
  } else {
    liveSessionsContainer.innerHTML = '<p>No live exams currently.</p>';
  }
};

const loadQuestions = async () => {
  const data = await request('/api/admin/questions');
  questionTable.innerHTML = '';
  if (data.questions.length) {
    data.questions.forEach((question) => {
      const tr = document.createElement('tr');
      const tdSubject = document.createElement('td');
      tdSubject.textContent = question.subject;
      tr.appendChild(tdSubject);
      const tdQuestion = document.createElement('td');
      tdQuestion.textContent = question.questionText;
      tr.appendChild(tdQuestion);
      const tdAnswer = document.createElement('td');
      tdAnswer.textContent = question.answer;
      tr.appendChild(tdAnswer);
      questionTable.appendChild(tr);
    });
  } else {
    questionTable.innerHTML = '<tr><td colspan="3">No questions found.</td></tr>';
  }
};

const loadSecurityData = async () => {
  const profile = await request('/api/auth/profile');
  currentThreatLevel = profile.user.threatLevel;
  applyThreatTheme(currentThreatLevel);

  const analytics = await request('/api/admin/analytics');
  const sessions = await request('/api/admin/sessions');

  const insights = generateInsights(analytics.stats, sessions.sessions);
  securityInsights.innerHTML = '';
  insights.forEach((insight) => {
    const node = document.createElement('div');
    node.className = 'security-insight';
    const h4 = document.createElement('h4');
    h4.textContent = insight.title;
    node.appendChild(h4);
    const p = document.createElement('p');
    p.textContent = insight.message;
    node.appendChild(p);
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = insight.action;
    node.appendChild(btn);
    securityInsights.appendChild(node);
  });

  if (profile.user.ipWhitelist) {
    ipWhitelist.value = profile.user.ipWhitelist.join('\n');
  }
};

subjectForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.querySelector('#subject-name').value.trim();
  const code = document.querySelector('#subject-code').value.trim();
  const duration = Number(document.querySelector('#subject-duration').value);
  await request('/api/admin/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code, duration }),
  });
  alert('Subject created successfully');
  subjectForm.reset();
  loadAnalytics();
});

questionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const subject = document.querySelector('#question-subject').value.trim();
  const questionText = document.querySelector('#question-text').value.trim();
  const choice1 = document.querySelector('#question-choice1').value.trim();
  const choice2 = document.querySelector('#question-choice2').value.trim();
  const choice3 = document.querySelector('#question-choice3').value.trim();
  const choice4 = document.querySelector('#question-choice4').value.trim();
  const answer = document.querySelector('#question-answer').value.trim();

  try {
    await request('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        questionText,
        choices: [choice1, choice2, choice3, choice4],
        answer,
      }),
    });
    alert('Question added successfully');
    questionForm.reset();
    loadQuestions();
  } catch (error) {
    alert('Error adding question');
  }
});

setupMFA?.addEventListener('click', async () => {
  const data = await request('/api/auth/mfa/setup', { method: 'POST' });
  mfaQR.innerHTML = '';
  const img = document.createElement('img');
  img.alt = 'MFA QR Code';
  img.src = data.qrCodeUrl;
  mfaQR.appendChild(img);
  mfaQR.style.display = 'block';
  mfaCode.style.display = 'block';
  enableMFA.style.display = 'block';
});

enableMFA?.addEventListener('click', async () => {
  const token = mfaCode.value.trim();
  await request('/api/auth/mfa/enable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  alert('MFA enabled successfully');
  mfaQR.style.display = 'none';
  mfaCode.style.display = 'none';
  enableMFA.style.display = 'none';
});

updateIPs?.addEventListener('click', async () => {
  const ips = ipWhitelist.value
    .split('\n')
    .map((ip) => ip.trim())
    .filter((ip) => ip);
  await request('/api/auth/ip-whitelist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ips }),
  });
  alert('IP whitelist updated');
});

refreshQuestions?.addEventListener('click', loadQuestions);

darkToggle?.addEventListener('click', () => {
  const dark = localStorage.getItem('cbt_dark') === 'true';
  localStorage.setItem('cbt_dark', (!dark).toString());
  document.body.classList.toggle('dark-mode', !dark);
});

logoutButton?.addEventListener('click', () => {
  localStorage.removeItem('cbt_token');
  localStorage.removeItem('cbt_role');
  window.location.href = '/login.html';
});

loadAnalytics();
loadSessions();
loadQuestions();
loadSecurityData();
