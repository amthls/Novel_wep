const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/novel_platform?schema=public',
});

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated hash for password123:', hash);
  const res = await pool.query('UPDATE users SET password_hash = $1', [hash]);
  console.log('Successfully updated password_hash for rows:', res.rowCount);

  // Verify
  const check = await pool.query('SELECT username, password_hash FROM users WHERE username = $1', ['admin']);
  console.log('Admin verification:');
  console.log('Username:', check.rows[0].username);
  console.log('Hash:', check.rows[0].password_hash);
  const match = await bcrypt.compare('password123', check.rows[0].password_hash);
  console.log('Password match test:', match);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});