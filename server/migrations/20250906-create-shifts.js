"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shifts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      openedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      closedAt: { type: Sequelize.DATE, allowNull: true },
      openedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      status: { type: Sequelize.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
      openingNote: { type: Sequelize.TEXT, allowNull: true },
      closingNote: { type: Sequelize.TEXT, allowNull: true },
      openingCashAmount: { type: Sequelize.DECIMAL(10,2), allowNull: true, defaultValue: null },
      closingCashAmount: { type: Sequelize.DECIMAL(10,2), allowNull: true, defaultValue: null },
      summary: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('shifts');
  }
};
