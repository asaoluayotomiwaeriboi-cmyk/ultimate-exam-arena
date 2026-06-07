const bcrypt = require('bcryptjs');
const db = require('../backend/config/db');

const email = 'admin@example.com';
const plain = 'admin123';

const hashed = bcrypt.hashSync(plain, 10);

db.get('SELECT id, email FROM users WHERE email = ?', [email], (err, row) => {
  if (err) { console.error(err); process.exit(1); }
  if (!row) {
    db.run('INSERT INTO users (name, email, password, role, profile) VALUES (?, ?, ?, ?, ?)', ['Admin', email, hashed, 'admin', JSON.stringify({})], function(err) {
      if (err) { console.error(err); process.exit(1); }
      console.log('Admin user created with password: admin123');
      process.exit(0);
    });
  } else {
    db.run('UPDATE users SET password = ?, role = ? WHERE email = ?', [hashed, 'admin', email], function(err) {
      if (err) { console.error(err); process.exit(1); }
      console.log('Admin password reset to: admin123');
      process.exit(0);
    });
  }
});
