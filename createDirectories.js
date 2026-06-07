const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'backend', 'services');
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
  console.log('Created services directory');
}

// Also ensure templates directory exists
const templatesDir = path.join(__dirname, 'backend', 'templates', 'emails');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
  console.log('Created templates/emails directory');
}

console.log('Directories created successfully');
