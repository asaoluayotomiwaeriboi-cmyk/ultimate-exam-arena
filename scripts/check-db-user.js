require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const result = await pool.query('SELECT id, name, email, role FROM users WHERE email = $1', ['verified2@example.com']);
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
