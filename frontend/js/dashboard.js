const dashboardStatus = document.querySelector('#dashboard-status');
const subjectList = document.querySelector('#subject-list');
const historyList = document.querySelector('#history-list');
const profileName = document.querySelector('#profile-name');
const profileEmail = document.querySelector('#profile-email');
const greetingMessage = document.querySelector('#greeting-message');
const darkToggle = document.querySelector('#dark-toggle');
const logoutButtons = document.querySelectorAll('.logout-btn');

const token = localStorage.getItem('token') || localStorage.getItem('cbt_token');
if (!token) window.location.href = '/login.html';

const request = async (path, options = {}) => {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, ...options });
  const data = await res.json();
  if (!data.success && res.status === 401) return window.location.href = '/login.html';
  return data;
};

const loadDashboard = async () => {
  try {
    const userRes = await request('/api/auth/profile');
    if (userRes.success) {
      profileName.textContent = userRes.user?.name || 'Student';
      profileEmail.textContent = userRes.user?.email || '';
      if (greetingMessage) {
        const firstName = (userRes.user?.name || 'Student').split(' ')[0];
        greetingMessage.textContent = `HELLO, ${firstName}!`;
      }
    }
  } catch (err) { console.error('Error loading user:', err); }

  try {
    const overview = await request('/api/dashboard/overview');
    if (overview.success) {
      // subjects
      subjectList.innerHTML = overview.subjects.map((item) => `
        <div class="card">
          <h3>${item.name}</h3>
          <p style="color: var(--text-muted);">Time: ${item.duration} mins • ${item.code}</p>
          <div class="toolbox" style="gap: 8px; margin-top: 12px;">
            <button class="btn btn-primary" onclick="window.location.href='/subject-picker.html'" style="flex: 1;">
              📚 JAMB Mode
            </button>
            <button class="btn btn-secondary" onclick="startSimulation('${item.code}')" style="flex: 1;">
              ⚡ Quick Test
            </button>
          </div>
        </div>
      `).join('');

      // history
      const history = overview.history || [];
      historyList.innerHTML = history.length ? history.map((item) => `
        <tr>
          <td>${item.subject || 'N/A'}</td>
          <td>${item.score || 0}/${item.totalQuestions || 40}</td>
          <td>${item.score && item.totalQuestions && (item.score / item.totalQuestions * 100).toFixed(0)}%</td>
          <td>${new Date(item.finishedAt).toLocaleDateString()}</td>
        </tr>
      `).join('') : '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No exam results yet.</td></tr>';
    }
  } catch (err) { console.error('Error loading overview:', err); }
};

window.startSimulation = async (subjectCode) => {
  const data = await request('/api/exams/start', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectCode }),
  });
  if (!data.success) return alert(data.message || 'Could not start exam');
  localStorage.setItem('currentSessionId', data.sessionId);
  window.location.href = '/exam.html';
};

window.startWithPassword = async () => {
  const password = prompt('Enter today\'s password for JAMB Mock Challenge:');
  if (!password) return;
  try {
    const res = await request('/api/exams/verify-competitive-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (res.success && res.correct) {
      window.location.href = '/subject-picker.html?mode=mock';
    } else {
      alert(res.message || 'Invalid password or expired.');
    }
  } catch (err) { 
    console.error('Error verifying password:', err);
    alert('Failed to verify password.');
  }
};

const applyTheme = () => {
  const dark = localStorage.getItem('dark_mode') === 'true';
  document.body.classList.toggle('dark-mode', dark);
};

darkToggle?.addEventListener('click', () => {
  const dark = localStorage.getItem('dark_mode') === 'true';
  localStorage.setItem('dark_mode', (!dark).toString());
  applyTheme();
});

logoutButtons.forEach((button) => button.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('cbt_token');
  localStorage.removeItem('cbt_role');
  window.location.href = '/login.html';
}));

applyTheme();
loadDashboard();
