"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'discountPercent', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Постоянная скидка пользователя в процентах'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'discountPercent');
  }
};
