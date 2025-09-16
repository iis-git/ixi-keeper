"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shift_bartenders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      shiftId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'shifts', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('shift_bartenders', {
      fields: ['shiftId', 'userId'],
      type: 'unique',
      name: 'shift_bartenders_unique_shift_user'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('shift_bartenders');
  }
};
