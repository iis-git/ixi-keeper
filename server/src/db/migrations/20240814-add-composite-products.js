'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем поле isComposite в таблицу products
    await queryInterface.addColumn('products', 'isComposite', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Является ли товар составным (коктейлем)'
    });

    // Создаем таблицу product_ingredients
    await queryInterface.createTable('product_ingredients', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      compositeProductId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID составного товара (коктейля)'
      },
      ingredientProductId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID товара-ингредиента'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        comment: 'Количество ингредиента, необходимое для одной порции составного товара'
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

    // Добавляем уникальный индекс
    await queryInterface.addIndex('product_ingredients', {
      fields: ['compositeProductId', 'ingredientProductId'],
      unique: true,
      name: 'unique_composite_ingredient'
    });
  },

  async down(queryInterface, Sequelize) {
    // Удаляем таблицу product_ingredients
    await queryInterface.dropTable('product_ingredients');
    
    // Удаляем поле isComposite из таблицы products
    await queryInterface.removeColumn('products', 'isComposite');
  }
};
