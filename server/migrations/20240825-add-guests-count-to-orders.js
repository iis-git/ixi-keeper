"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'guestsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Количество гостей за столом/в заказе',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'guestsCount');
  },
};
