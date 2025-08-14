const { Sequelize } = require('sequelize');
require('dotenv').config();

// Создаем подключение к базе данных
const sequelize = new Sequelize({
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'ixi_keeper',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: console.log,
});

async function migrateProducts() {
  try {
    console.log('Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('Подключение успешно!');

    const queryInterface = sequelize.getQueryInterface();

    console.log('Проверяем существующие колонки...');
    
    // Проверяем, существует ли колонка categoryId
    try {
      await queryInterface.describeTable('products');
      console.log('Таблица products найдена');
    } catch (error) {
      console.error('Ошибка при описании таблицы products:', error.message);
      return;
    }

    // Добавляем колонки по одной, игнорируя ошибки если колонка уже существует
    const columnsToAdd = [
      {
        name: 'categoryId',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'categories',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }
      },
      {
        name: 'stock',
        definition: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        }
      },
      {
        name: 'unitSize',
        definition: {
          type: Sequelize.INTEGER,
          defaultValue: 1,
          allowNull: false
        }
      },
      {
        name: 'unit',
        definition: {
          type: Sequelize.STRING,
          defaultValue: 'шт',
          allowNull: false
        }
      },
      {
        name: 'isActive',
        definition: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        }
      }
    ];

    for (const column of columnsToAdd) {
      try {
        console.log(`Добавляем колонку ${column.name}...`);
        await queryInterface.addColumn('products', column.name, column.definition);
        console.log(`✓ Колонка ${column.name} добавлена успешно`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`- Колонка ${column.name} уже существует`);
        } else {
          console.error(`✗ Ошибка при добавлении колонки ${column.name}:`, error.message);
        }
      }
    }

    console.log('Миграция завершена!');
    
  } catch (error) {
    console.error('Ошибка миграции:', error);
  } finally {
    await sequelize.close();
  }
}

migrateProducts();
