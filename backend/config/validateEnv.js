const required = [
  { name: 'JWT_SECRET', requiredInProd: true },
  { name: 'DATABASE_URL', requiredInProd: false },
  { name: 'SESSION_SECRET', requiredInProd: false },
];

function validateEnv() {
  const missing = [];
  required.forEach((r) => {
    if (!process.env[r.name]) {
      missing.push(r.name);
    }
  });

  if (missing.length) {
    console.warn('Missing environment variables:', missing.join(', '));
    // In production we should fail fast
    if (process.env.NODE_ENV === 'production') {
      console.error('Required environment variables are missing in production. Aborting.');
      process.exit(1);
    }
  }
}

module.exports = validateEnv;
