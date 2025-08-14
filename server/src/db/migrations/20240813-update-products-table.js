'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем новые колонки в таблицу products
    await queryInterface.addColumn('products', 'categoryId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('products', 'stock', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('products', 'unitSize', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Количество единиц, списываемых при продаже'
    });

    await queryInterface.addColumn('products', 'unit', {
      type: Sequelize.STRING,
      defaultValue: 'шт',
      allowNull: false,
      comment: 'Единица измерения (шт, кг, л и т.д.)'
    });

    await queryInterface.addColumn('products', 'isActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Удаляем добавленные колонки при откате миграции
    await queryInterface.removeColumn('products', 'categoryId');
    await queryInterface.removeColumn('products', 'stock');
    await queryInterface.removeColumn('products', 'unitSize');
    await queryInterface.removeColumn('products', 'unit');
    await queryInterface.removeColumn('products', 'isActive');
  }
};
