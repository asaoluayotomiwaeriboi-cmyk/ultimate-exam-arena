const db = require('../backend/config/db');
const { randomUUID } = require('crypto');

function findSubjectAndInsert() {
  db.get("SELECT id, name, code FROM subjects WHERE name LIKE '%Math%' OR name LIKE '%math%' OR name LIKE '%Mathematics%' LIMIT 1", [], (err, row) => {
    if (err) { console.error('ERR_SUBJECT', err); process.exit(1); }
    if (!row) {
      db.get('SELECT id,name,code FROM subjects LIMIT 1', [], (e, r) => {
        if (e) { console.error(e); process.exit(1); }
        insertQuestion(r);
      });
    } else insertQuestion(row);
  });
}

function insertQuestion(subject) {
  const q = {
    subject: subject.name,
    questionText: 'What is 2+2?',
    choices: JSON.stringify(['3','4','5','6']),
    answer: '4'
  };
  db.run('INSERT INTO questions (subject, questionText, choices, answer) VALUES (?, ?, ?, ?)', [q.subject, q.questionText, q.choices, q.answer], function(err) {
    if (err) { console.error('ERR_INSERT', err); process.exit(1); }
    console.log(JSON.stringify({ insertedQuestionId: this.lastID, subject }));
    process.exit(0);
  });
}

findSubjectAndInsert();
