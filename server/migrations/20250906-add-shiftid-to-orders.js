"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'shiftId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'shifts', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Смена, в рамках которой создан заказ'
    });
    await queryInterface.addIndex('orders', ['shiftId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('orders', ['shiftId']);
    await queryInterface.removeColumn('orders', 'shiftId');
  }
};
