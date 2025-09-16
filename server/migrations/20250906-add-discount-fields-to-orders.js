"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'discountPercent', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Скидка на заказ в процентах (ручная или применённая)'
    });
    await queryInterface.addColumn('orders', 'discountAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Сумма скидки в валюте'
    });
    await queryInterface.addColumn('orders', 'netAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Итог к оплате после скидки'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'discountPercent');
    await queryInterface.removeColumn('orders', 'discountAmount');
    await queryInterface.removeColumn('orders', 'netAmount');
  }
};
