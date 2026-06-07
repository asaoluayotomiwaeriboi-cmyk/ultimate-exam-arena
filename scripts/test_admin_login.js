admin(async () => {
  const base = 'http://localhost:5000';
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'admin@example.com', password: 'admin123', adminCode: 'ADMIN2010' }) });
  const data = await res.json();
  console.log('admin login test:', data);
})();
