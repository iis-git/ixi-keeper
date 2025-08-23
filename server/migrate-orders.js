require('dotenv').config();
const { sequelize } = require('./src/db/models');

async function migrateOrders() {
  try {
    console.log('Начинаем миграцию таблицы orders...');

    // Добавляем новые колонки
    await sequelize.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS "guestName" VARCHAR(255) NOT NULL DEFAULT 'Гость',
      ADD COLUMN IF NOT EXISTS "orderItems" JSON NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "comment" TEXT,
      ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP WITH TIME ZONE;
    `);
    console.log('Новые колонки добавлены');

    // Обновляем тип колонки totalAmount
    await sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN "totalAmount" TYPE DECIMAL(10,2);
    `);
    console.log('Тип колонки totalAmount обновлен');

    // Обновляем ENUM для статуса
    await sequelize.query(`
      ALTER TABLE orders 
      DROP CONSTRAINT IF EXISTS orders_status_check;
    `);
    
    await sequelize.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('active', 'completed', 'cancelled'));
    `);
    console.log('ENUM статуса обновлен');

    // Добавляем ENUM для способа оплаты
    await sequelize.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_paymentMethod_check 
      CHECK ("paymentMethod" IN ('cash', 'card', 'transfer') OR "paymentMethod" IS NULL);
    `);
    console.log('ENUM способа оплаты добавлен');

    // Делаем userId необязательным
    await sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN "userId" DROP NOT NULL;
    `);
    console.log('Колонка userId сделана необязательной');

    console.log('Миграция таблицы orders завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при миграции таблицы orders:', error);
    process.exit(1);
  }
}

migrateOrders();
