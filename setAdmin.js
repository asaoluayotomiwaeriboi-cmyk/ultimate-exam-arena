const db = require('./backend/config/db');

(async () => {
  try {
    await db.run("UPDATE users SET role = 'admin' WHERE email = ?", ['admin@example.com']);
    console.log('Admin role set successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
})();
