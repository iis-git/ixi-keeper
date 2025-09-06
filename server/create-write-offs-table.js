require('dotenv').config();
const { sequelize } = require('./src/db/models');

async function up() {
  try {
    console.log('Creating write_offs table if not exists...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS write_offs (
        id SERIAL PRIMARY KEY,
        "orderId" INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
        "productId" INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        reason VARCHAR(255),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_write_offs_order_id ON write_offs("orderId");`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_write_offs_product_id ON write_offs("productId");`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_write_offs_created_at ON write_offs("createdAt");`);

    console.log('✓ write_offs ready');
    process.exit(0);
  } catch (e) {
    console.error('Failed to create write_offs:', e);
    process.exit(1);
  }
}

up();
