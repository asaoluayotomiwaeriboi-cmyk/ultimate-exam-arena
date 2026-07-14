const db = require('../backend/config/db');

const subjects = [
  { name: 'USE OF ENGLISH', code: 'USE_OF_ENGLISH', duration: 60 },
  { name: 'JAMB Mock', code: 'JAMB', duration: 180 },
];

const questions = [
  {
    subject: 'USE OF ENGLISH',
    questionText: 'Which of the following is an abstract noun?',
    choices: JSON.stringify(['Car', 'Beauty', 'Apple', 'Chair']),
    answer: 'Beauty',
  },
  {
    subject: 'JAMB Mock',
    questionText: 'JAMB: The capital of Nigeria is?',
    choices: JSON.stringify(['Lagos', 'Abuja', 'Kano', 'Port Harcourt']),
    answer: 'Abuja',
  },
  {
    subject: 'JAMB Mock',
    questionText: 'JAMB: 2+2=?',
    choices: JSON.stringify(['3', '4', '5', '6']),
    answer: '4',
  },
];

console.log('Inserting JAMB subjects and questions...');

for (const s of subjects) {
  db.run(
    'INSERT INTO subjects (name, code, duration, active) VALUES (?, ?, ?, ?) ON CONFLICT (code) DO NOTHING',
    [s.name, s.code, s.duration, 1]
  );
}

for (const q of questions) {
  db.run(
    'INSERT INTO questions (subject, questionText, choices, answer) VALUES (?, ?, ?, ?) ON CONFLICT (questionText) DO NOTHING',
    [q.subject, q.questionText, q.choices, q.answer]
  );
}

setTimeout(() => {
  db.all('SELECT id, name, code FROM subjects', [], (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log('Subjects now:', rows);
    db.get('SELECT COUNT(*) as count FROM questions', (err, row) => {
      console.log('Total questions:', row.count);
      process.exit(0);
    });
  });
}, 500);
