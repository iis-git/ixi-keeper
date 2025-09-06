require('dotenv').config();
const { sequelize } = require('./src/db/models');

async function up() {
  try {
    console.log('Adding guestType column to users if not exists...');
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='guestType'
        ) THEN
          ALTER TABLE users 
          ADD COLUMN "guestType" VARCHAR(32) NOT NULL DEFAULT 'guest';
        END IF;
      END
      $$;
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_guest_type ON users("guestType");`);
    console.log('✓ guestType ready');
    process.exit(0);
  } catch (e) {
    console.error('Failed to add guestType:', e);
    process.exit(1);
  }
}

up();
