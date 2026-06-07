async function loadLogs(limit) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login as admin');
    return;
  }
  limit = limit || document.getElementById('logLimit')?.value || 200;
  const resp = await fetch('/api/admin/daily-password/logs?limit=' + encodeURIComponent(limit), {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data = await resp.json();
  if (!data.success) return alert('Failed to load logs');
  const tbody = document.querySelector('#logs-table tbody');
  tbody.innerHTML = '';
  data.logs.forEach((r) => {
    const tr = document.createElement('tr');
    const time = new Date(r.attemptedAt * 1000).toLocaleString();
    tr.innerHTML = `<td>${time}</td><td>${r.userName||'Unknown'}</td><td>${r.userEmail||'N/A'}</td><td>${r.passwordId}</td><td>${r.isCorrect? 'Yes':'No'}</td><td>${r.ipAddress||''}</td><td>${r.userAgent||''}</td>`;
    tbody.appendChild(tr);
  });
  return data.logs;
}

function downloadCSV(filename, rows) {
  const header = ['Time','User','Email','PasswordId','Correct','IP','UserAgent'];
  const csv = [header.join(',')].concat(rows.map(r => [new Date(r.attemptedAt*1000).toISOString(), (r.userName||''), (r.userEmail||''), r.passwordId, r.isCorrect? 'Yes':'No', (r.ipAddress||''), '"' + (r.userAgent||'') + '"'].join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  loadLogs();
  document.getElementById('refreshBtn').addEventListener('click', () => loadLogs());
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const logs = await loadLogs();
    if (logs) downloadCSV('password_verification_logs.csv', logs);
  });
});
