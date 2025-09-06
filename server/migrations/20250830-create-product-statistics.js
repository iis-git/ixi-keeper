'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_statistics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
        comment: 'Название товара (сохраняется для истории)'
      },
      totalQuantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Общее количество проданного товара'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Общая сумма продаж товара'
      },
      totalCostAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Общая себестоимость проданного товара'
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
        comment: 'Дата последнего заказа с этим товаром'
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

    // Добавляем индексы
    await queryInterface.addIndex('product_statistics', ['productId'], {
      unique: true,
      name: 'product_statistics_product_id_unique'
    });
    
    await queryInterface.addIndex('product_statistics', ['totalQuantity'], {
      name: 'product_statistics_total_quantity_index'
    });
    
    await queryInterface.addIndex('product_statistics', ['totalAmount'], {
      name: 'product_statistics_total_amount_index'
    });
    
    await queryInterface.addIndex('product_statistics', ['orderCount'], {
      name: 'product_statistics_order_count_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_statistics');
  }
};
