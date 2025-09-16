require('dotenv').config();
const { sequelize } = require('../db/models');

(async () => {
  try {
    console.log('Synchronizing database schema from models (force: true)...');
    await sequelize.sync({ force: true });
    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error('Sync error:', e);
    process.exit(1);
  }
})();
