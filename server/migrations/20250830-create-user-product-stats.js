'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_product_stats', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID пользователя'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID товара'
      },
      productName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Название товара (для истории, если товар будет удален)'
      },
      totalQuantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Общее количество заказанного товара'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Общая сумма потраченная на этот товар'
      },
      orderCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Количество заказов с этим товаром'
      },
      lastOrderDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Дата последнего заказа этого товара'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Создаем уникальный индекс для пары userId-productId
    await queryInterface.addIndex('user_product_stats', ['userId', 'productId'], {
      unique: true,
      name: 'user_product_stats_user_product_unique'
    });

    // Создаем индексы для быстрого поиска
    await queryInterface.addIndex('user_product_stats', ['userId'], {
      name: 'user_product_stats_user_id_index'
    });

    await queryInterface.addIndex('user_product_stats', ['productId'], {
      name: 'user_product_stats_product_id_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_product_stats');
  }
};
