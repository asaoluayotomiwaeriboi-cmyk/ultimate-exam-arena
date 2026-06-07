const db = require('./backend/config/db');

(async () => {
  try {
    await db.run("UPDATE users SET role = 'admin' WHERE email = ?", ['admin@example.com']);
    console.log('Admin role set successfully');
    const rows = await db.all('SELECT id, email, role FROM users');
    console.log('Users:', rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
})();
