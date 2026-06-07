const db = require('../backend/config/db');

async function inspect() {
  try {
    const row = await db.get('SELECT id FROM users WHERE email = ?', ['student1@example.com']);
    console.log(JSON.stringify({ userId: row ? row.id : null }));
    if (!row) {
      return;
    }
    const uid = row.id;
    const rows = await db.all(
      'SELECT id,userId,passwordId,isCorrect,attemptedAt FROM password_verification_logs WHERE userId = ?',
      [uid]
    );
    console.log(JSON.stringify({ verifications: rows }));
    const rows3 = await db.all(
      'SELECT id,student,subject,startedAt,finished,expiresAt FROM exam_sessions WHERE student = ?',
      [uid]
    );
    console.log(JSON.stringify({ sessions: rows3 }));
  } catch (err) {
    console.error('ERR_INSPECT', err);
    process.exit(1);
  }
}

inspect();
