'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'lowStockThreshold', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Порог остатка для оповещения (0/NULL = отключено)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'lowStockThreshold');
  }
};
