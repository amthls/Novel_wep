import { pool } from '../src/config/db';

async function addImagesColumn() {
  try {
    await pool.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅ Added images JSONB column to posts table!');
  } catch (err) {
    console.error('Error adding images column:', err);
  } finally {
    process.exit(0);
  }
}

addImagesColumn();
