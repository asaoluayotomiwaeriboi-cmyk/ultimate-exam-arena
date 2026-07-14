const db = require('../backend/config/db');

db.all('SELECT id, name, code, duration, active FROM subjects', [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Subjects:', rows);
  process.exit(0);
});
