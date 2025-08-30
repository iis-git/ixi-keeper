'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // phone -> nullable (безопасно вызывать многократно)
    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Добавляем колонки, только если их нет
    const table = await queryInterface.describeTable('users');

    if (!table.comment) {
      await queryInterface.addColumn('users', 'comment', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!table.isDebtor) {
      await queryInterface.addColumn('users', 'isDebtor', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.removeColumn('users', 'comment');
    await queryInterface.removeColumn('users', 'isDebtor');
  }
};
