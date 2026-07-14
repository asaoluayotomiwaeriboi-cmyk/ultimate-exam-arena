const db = require('../backend/config/db');

const subjects = [
  { name: 'USE OF ENGLISH', code: 'USE_OF_ENGLISH', duration: 60 },
  { name: 'Mathematics', code: 'MATH', duration: 60 },
  { name: 'Physics', code: 'PHY', duration: 60 },
  { name: 'Chemistry', code: 'CHEM', duration: 60 },
  { name: 'Biology', code: 'BIO', duration: 60 },
  { name: 'Further Mathematics', code: 'FURTHER_MATH', duration: 60 },
  { name: 'Economics', code: 'ECO', duration: 60 },
  { name: 'Government', code: 'GOV', duration: 60 },
  { name: 'History', code: 'HIST', duration: 60 },
  { name: 'Geography', code: 'GEO', duration: 60 },
  { name: 'Literature in English', code: 'LIT', duration: 60 },
  { name: 'Commerce', code: 'COM', duration: 60 },
  { name: 'Accounting', code: 'ACC', duration: 60 },
  { name: 'Agricultural Science', code: 'AGR', duration: 60 },
  { name: 'Computer Science', code: 'CSC', duration: 60 },
  { name: 'Principles of Management', code: 'POM', duration: 60 },
  { name: 'Islamic Religious Studies', code: 'IRS', duration: 60 },
  { name: 'Yoruba', code: 'YOR', duration: 60 },
  { name: 'Hausa', code: 'HAU', duration: 60 },
  { name: 'Igbo', code: 'IGB', duration: 60 },
  { name: 'JAMB Mock', code: 'JAMB', duration: 180 },
];

console.log('Seeding JAMB subject list...');

(async () => {
  try {
    for (const s of subjects) {
      await db.run(
        'INSERT INTO subjects (name, code, duration, active) VALUES (?, ?, ?, ?) ON CONFLICT (code) DO NOTHING',
        [s.name, s.code, s.duration, 1]
      );
    }
    const rows = await db.all('SELECT id, name, code FROM subjects ORDER BY name');
    console.log('Subjects now:', rows.map((r) => r.code).join(', '));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
})();
