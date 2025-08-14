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

async function updateStockType() {
  try {
    console.log('Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('Подключение успешно!');

    const queryInterface = sequelize.getQueryInterface();

    console.log('Изменяем тип колонки stock на DECIMAL...');
    
    // Изменяем тип колонки stock с INTEGER на DECIMAL(10,2)
    await queryInterface.changeColumn('products', 'stock', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    });

    console.log('✓ Тип колонки stock успешно изменен на DECIMAL(10,2)');

    // Также изменим тип колонки price на DECIMAL для консистентности
    await queryInterface.changeColumn('products', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });

    console.log('✓ Тип колонки price успешно изменен на DECIMAL(10,2)');

    console.log('Обновление типов завершено!');
    
  } catch (error) {
    console.error('Ошибка обновления:', error);
  } finally {
    await sequelize.close();
  }
}

updateStockType();
