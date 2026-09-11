import { pool } from '../src/config/db';

async function migratePosts() {
  try {
    await pool.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;
      UPDATE posts SET approval_status = 'approved' WHERE approval_status IS NULL;
    `);
    console.log('✅ Updated posts table schema successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migratePosts();
