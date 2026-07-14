(async () => {
  const base = 'http://localhost:5000';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  if (!process.env.ADMIN_PASSWORD)
    console.warn(
      'Using fallback admin password in test_admin_login.js — set ADMIN_PASSWORD env for tests.'
    );
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: ADMIN_PASSWORD,
      adminCode: 'ADMIN2010',
    }),
  });
  const data = await res.json();
  console.log('admin login test:', data);
})();
