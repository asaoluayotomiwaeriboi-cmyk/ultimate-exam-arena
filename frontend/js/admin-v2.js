const API_BASE = '/api';
let token = localStorage.getItem('token');
let currentExamBody = 'JAMB';

if (!token) window.location.href = '/login.html';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    e.target.classList.add('active');
    const tabId = e.target.dataset.tab + '-tab';
    document.getElementById(tabId).classList.add('active');
    if (e.target.dataset.tab === 'dashboard') loadDashboard();
    else if (e.target.dataset.tab === 'jamb') loadJAMBTab();
  });
});

// Sidebar action switching (within JAMB tab)
document.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('[data-action]').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const action = e.target.dataset.action;
    document.getElementById('manage-subjects-section').style.display = 'none';
    document.getElementById('manage-questions-section').style.display = 'none';
    document.getElementById('manage-competitions-section').style.display = 'none';
    document.getElementById('manage-passwords-section').style.display = 'none';
    document.getElementById(`manage-${action}-section`).style.display = 'block';
    if (action === 'subjects') loadSubjects();
    else if (action === 'questions') loadQuestions();
    else if (action === 'competitions') loadCompetitions();
  });
});

async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-students').textContent = data.stats.totalStudents || 0;
      document.getElementById('stat-questions').textContent = data.stats.totalQuestions || 0;
      document.getElementById('stat-exams').textContent = data.stats.totalExams || 0;
      document.getElementById('stat-subjects').textContent = data.stats.topSubjects?.length || 0;
    }
  } catch (err) { console.error('Error loading analytics:', err); }

  try {
    const res = await fetch(`${API_BASE}/admin/sessions`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      // Filter only finished=false (active sessions)
      const activeSessions = data.sessions.filter(s => !s.finished);
      const html = activeSessions.length > 0 
        ? activeSessions.map(s => `
            <div class="session-item">
              <strong>${s.studentName || 'Student'}</strong> - ${s.subject}
              <div class="time">Started: ${new Date(s.startedAt * 1000).toLocaleString()}</div>
            </div>`).join('')
        : '<p style="color: var(--text-muted);">No active exams right now.</p>';
      document.getElementById('live-sessions').innerHTML = html;
    }
  } catch (err) { console.error('Error loading sessions:', err); }
}

async function loadJAMBTab() {
  loadSubjects();
}

async function loadSubjects() {
  try {
    const res = await fetch(`${API_BASE}/exams/subjects`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      const jamb_subjects = data.subjects.filter(s => ['JAMB', 'USE_OF_ENGLISH', 'MATH', 'PHY', 'CHEM', 'BIO'].includes(s.code) || s.code.includes('JAMB'));
      const html = jamb_subjects.length > 0
        ? jamb_subjects.map(s => `
            <div class="subject-card" onclick="openSubjectQuestions(${s.id}, '${s.name}')">
              <h4>${s.name}</h4>
              <div class="q-count">${s.code}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">Tap to manage</div>
            </div>`).join('')
        : '<p style="color: var(--text-muted);">No JAMB subjects found.</p>';
      document.getElementById('subject-grid').innerHTML = html;
    }
  } catch (err) { console.error('Error loading subjects:', err); }
}

async function loadQuestions() {
  try {
    const res = await fetch(`${API_BASE}/admin/questions`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success && data.questions.length > 0) {
      const shuffled = data.questions.sort(() => Math.random() - 0.5).slice(0, 50);
      const html = shuffled.map(q => `
        <div class="question-item">
          <div class="q-text">${q.questionText || 'N/A'}</div>
          <div class="q-answer"><strong>Answer:</strong> ${q.answer || 'N/A'} | <strong>Subject:</strong> ${q.subject || 'N/A'}</div>
        </div>`).join('');
      document.getElementById('questions-list').innerHTML = html;
    }
  } catch (err) { console.error('Error loading questions:', err); }
}

async function loadCompetitions() {
  try {
    const res = await fetch(`${API_BASE}/admin/sessions`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      const html = data.sessions.length > 0
        ? `<p>Active sessions: ${data.sessions.length}</p>`
        : '<p style="color: var(--text-muted);">No active competitions.</p>';
      document.getElementById('competitions-list').innerHTML = html;
    }
  } catch (err) { console.error('Error loading competitions:', err); }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function openSubjectQuestions(subjectId, subjectName) {
  console.log(`Open subject: ${subjectName} (ID: ${subjectId})`);
  alert(`Questions for ${subjectName} - Feature coming soon`);
}

document.getElementById('add-subject-btn')?.addEventListener('click', () => {
  document.getElementById('add-subject-modal').classList.add('active');
});

document.getElementById('add-question-btn')?.addEventListener('click', () => {
  document.getElementById('add-question-modal').classList.add('active');
});

document.getElementById('subject-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('subject-name').value;
  const code = document.getElementById('subject-code').value;
  const duration = parseInt(document.getElementById('subject-duration').value);
  try {
    const res = await fetch(`${API_BASE}/admin/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, code, duration })
    });
    const data = await res.json();
    if (data.success) {
      alert('Subject added successfully!');
      closeModal('add-subject-modal');
      loadSubjects();
    }
  } catch (err) { console.error('Error adding subject:', err); }
});

document.getElementById('question-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject = document.getElementById('question-subject').value;
  const questionText = document.getElementById('question-text').value;
  const choices = [
    document.getElementById('question-choice1').value,
    document.getElementById('question-choice2').value,
    document.getElementById('question-choice3').value,
    document.getElementById('question-choice4').value
  ];
  const answer = document.getElementById('question-answer').value;
  try {
    const res = await fetch(`${API_BASE}/admin/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject, questionText, choices, answer })
    });
    const data = await res.json();
    if (data.success) {
      alert('Question added successfully!');
      closeModal('add-question-modal');
      e.target.reset();
    }
  } catch (err) { console.error('Error adding question:', err); }
});

// Logout
document.querySelector('.logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
});

// Dark mode
document.getElementById('dark-toggle')?.addEventListener('click', () => {
  document.getElementById('admin-body').classList.toggle('dark-mode');
});

// Password management (generate / show current / send)
async function refreshPasswordStatus() {
  try {
    const res = await fetch(`${API_BASE}/admin/daily-password/current`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const container = document.getElementById('passwords-list');
    if (!data.success || !data.hasActivePassword) {
      container.innerHTML = `<p style="color: var(--text-muted);">No active password.</p>`;
      return;
    }

    const html = `
      <div style="background: var(--surface); padding: 12px; border-radius: 10px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <div style="font-weight:700; color:var(--primary);">Active Password ID: ${data.passwordId}</div>
          <div style="color:var(--text-muted);">Expires: ${data.expiresAt}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="send-password-btn" class="btn btn-primary">Send to Students</button>
        </div>
      </div>
    `;
    container.innerHTML = html;

    document.getElementById('send-password-btn')?.addEventListener('click', async () => {
      try {
        const sendRes = await fetch(`${API_BASE}/admin/daily-password/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ passwordId: data.passwordId })
        });
        const sendData = await sendRes.json();
        alert(sendData.message || 'Password distribution initiated');
      } catch (err) {
        console.error('Error sending password:', err);
        alert('Failed to send password to students');
      }
    });
  } catch (err) {
    console.error('Error fetching password status:', err);
  }
}

document.getElementById('generate-password-btn')?.addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/admin/daily-password/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ durationHours: 24 })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Password generated: ${data.password} (ID: ${data.passwordId})`);
      refreshPasswordStatus();
    } else {
      alert(data.message || 'Failed to generate password');
    }
  } catch (err) {
    console.error('Error generating password:', err);
    alert('Failed to generate password');
  }
});

// Load on page load
loadDashboard();
refreshPasswordStatus();
