require('dotenv').config();
const { sequelize } = require('./src/db/models');

async function runMigration() {
  try {
    console.log('Запуск миграции для составных товаров...');
    
    // Добавляем поле isComposite в таблицу products
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS "isComposite" BOOLEAN DEFAULT false NOT NULL;
    `);
    console.log('✓ Добавлено поле isComposite в таблицу products');

    // Добавляем поле costPrice (себестоимость) в таблицу products
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2) DEFAULT 0 NOT NULL;
    `);
    console.log('✓ Добавлено поле costPrice в таблицу products');

    // Добавляем поле sortOrder (сортировка) в таблицу products
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0 NOT NULL;
    `);
    console.log('✓ Добавлено поле sortOrder в таблицу products');

    // Создаем таблицу product_ingredients
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_ingredients (
        id SERIAL PRIMARY KEY,
        "compositeProductId" INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
        "ingredientProductId" INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
        quantity DECIMAL(10,3) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE("compositeProductId", "ingredientProductId")
      );
    `);
    console.log('✓ Создана таблица product_ingredients');

    console.log('Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при выполнении миграции:', error);
    process.exit(1);
  }
}

runMigration();
