const db = require('../config/db');

const expandedSubjects = [
  // UTME/JAMB Subjects (Compulsory and Stream-specific)
  { name: 'English Language', code: 'ENG', duration: 120, stream: 'all', examBody: 'JAMB' },
  { name: 'Mathematics', code: 'MATH', duration: 120, stream: 'all', examBody: 'JAMB' },
  
  // Science Stream
  { name: 'Physics', code: 'PHY', duration: 120, stream: 'science', examBody: 'JAMB' },
  { name: 'Chemistry', code: 'CHEM', duration: 120, stream: 'science', examBody: 'JAMB' },
  { name: 'Biology', code: 'BIO', duration: 120, stream: 'science', examBody: 'JAMB' },
  
  // Arts Stream
  { name: 'Literature in English', code: 'LIT', duration: 120, stream: 'arts', examBody: 'JAMB' },
  { name: 'History', code: 'HIST', duration: 120, stream: 'arts', examBody: 'JAMB' },
  { name: 'Government', code: 'GOV', duration: 120, stream: 'arts', examBody: 'JAMB' },
  { name: 'Geography', code: 'GEO', duration: 120, stream: 'arts', examBody: 'JAMB' },
  { name: 'Economics', code: 'ECON', duration: 120, stream: 'arts', examBody: 'JAMB' },
  { name: 'CRS/Islamic Studies', code: 'REL', duration: 120, stream: 'arts', examBody: 'JAMB' },
  
  // Commercial Stream
  { name: 'Accounting', code: 'ACC', duration: 120, stream: 'commercial', examBody: 'JAMB' },
  { name: 'Business Studies', code: 'BUS', duration: 120, stream: 'commercial', examBody: 'JAMB' },
  { name: 'Economics', code: 'ECON_COM', duration: 120, stream: 'commercial', examBody: 'JAMB' },
  
  // WAEC Subjects (SSCE)
  { name: 'English Language (WAEC)', code: 'ENG_WAEC', duration: 120, stream: 'all', examBody: 'WAEC' },
  { name: 'Mathematics (WAEC)', code: 'MATH_WAEC', duration: 120, stream: 'all', examBody: 'WAEC' },
  { name: 'Physics (WAEC)', code: 'PHY_WAEC', duration: 120, stream: 'science', examBody: 'WAEC' },
  { name: 'Chemistry (WAEC)', code: 'CHEM_WAEC', duration: 120, stream: 'science', examBody: 'WAEC' },
  { name: 'Biology (WAEC)', code: 'BIO_WAEC', duration: 120, stream: 'science', examBody: 'WAEC' },
  { name: 'Literature in English (WAEC)', code: 'LIT_WAEC', duration: 120, stream: 'arts', examBody: 'WAEC' },
  { name: 'History (WAEC)', code: 'HIST_WAEC', duration: 120, stream: 'arts', examBody: 'WAEC' },
  { name: 'Government (WAEC)', code: 'GOV_WAEC', duration: 120, stream: 'arts', examBody: 'WAEC' },
  { name: 'Geography (WAEC)', code: 'GEO_WAEC', duration: 120, stream: 'arts', examBody: 'WAEC' },
  { name: 'Economics (WAEC)', code: 'ECON_WAEC', duration: 120, stream: 'arts', examBody: 'WAEC' },
  { name: 'Accounting (WAEC)', code: 'ACC_WAEC', duration: 120, stream: 'commercial', examBody: 'WAEC' },
  { name: 'Business Studies (WAEC)', code: 'BUS_WAEC', duration: 120, stream: 'commercial', examBody: 'WAEC' },
  
  // NECO Subjects (SSCE)
  { name: 'English Language (NECO)', code: 'ENG_NECO', duration: 120, stream: 'all', examBody: 'NECO' },
  { name: 'Mathematics (NECO)', code: 'MATH_NECO', duration: 120, stream: 'all', examBody: 'NECO' },
  { name: 'Physics (NECO)', code: 'PHY_NECO', duration: 120, stream: 'science', examBody: 'NECO' },
  { name: 'Chemistry (NECO)', code: 'CHEM_NECO', duration: 120, stream: 'science', examBody: 'NECO' },
  { name: 'Biology (NECO)', code: 'BIO_NECO', duration: 120, stream: 'science', examBody: 'NECO' },
  { name: 'Literature in English (NECO)', code: 'LIT_NECO', duration: 120, stream: 'arts', examBody: 'NECO' },
  { name: 'History (NECO)', code: 'HIST_NECO', duration: 120, stream: 'arts', examBody: 'NECO' },
  { name: 'Government (NECO)', code: 'GOV_NECO', duration: 120, stream: 'arts', examBody: 'NECO' },
  { name: 'Geography (NECO)', code: 'GEO_NECO', duration: 120, stream: 'arts', examBody: 'NECO' },
  { name: 'Economics (NECO)', code: 'ECON_NECO', duration: 120, stream: 'arts', examBody: 'NECO' },
  { name: 'Accounting (NECO)', code: 'ACC_NECO', duration: 120, stream: 'commercial', examBody: 'NECO' },
  { name: 'Business Studies (NECO)', code: 'BUS_NECO', duration: 120, stream: 'commercial', examBody: 'NECO' }
];

async function seedSubjects() {
  const Subject = require('../models/Subject');
  
  try {
    console.log('Seeding expanded subjects...');
    
    // Check if subjects already exist
    const existing = await Subject.find();
    
    if (existing.length < expandedSubjects.length) {
      await Subject.insertMany(expandedSubjects);
      console.log('Subjects seeded successfully');
    } else {
      console.log('Subjects already exist');
    }
  } catch (error) {
    console.error('Error seeding subjects:', error);
  }
}

module.exports = { expandedSubjects, seedSubjects };
