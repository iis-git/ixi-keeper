"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "guestType", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "guest",
      comment: "Тип гостя: owner | guest | regular | bartender",
    });
    await queryInterface.addIndex("users", ["guestType"], { name: "idx_users_guest_type" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", "idx_users_guest_type");
    await queryInterface.removeColumn("users", "guestType");
  },
};
