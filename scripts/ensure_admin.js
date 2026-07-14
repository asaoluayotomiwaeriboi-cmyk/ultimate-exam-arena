const bcrypt = require('bcryptjs');
const db = require('../backend/config/db');

const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const plain = process.env.ADMIN_PASSWORD;

if (!plain) {
  console.error('ADMIN_PASSWORD environment variable is not set. Aborting.');
  process.exit(1);
}

const hashed = bcrypt.hashSync(plain, 10);

db.get('SELECT id, email FROM users WHERE email = ?', [email], (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  if (!row) {
    db.run(
      'INSERT INTO users (name, email, password, role, profile) VALUES (?, ?, ?, ?, ?)',
      ['Admin', email, hashed, 'admin', JSON.stringify({})],
      function (err) {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        console.log(
          'Admin user created (password hidden). Set a secure password via the application UI or update the database.'
        );
        process.exit(0);
      }
    );
  } else {
    db.run(
      'UPDATE users SET password = ?, role = ? WHERE email = ?',
      [hashed, 'admin', email],
      function (err) {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        console.log('Admin password reset (password hidden).');
        process.exit(0);
      }
    );
  }
});
