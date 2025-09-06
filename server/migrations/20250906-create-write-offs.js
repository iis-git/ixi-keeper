"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("write_offs", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // Индексы
    await queryInterface.addIndex("write_offs", ["orderId"]);
    await queryInterface.addIndex("write_offs", ["productId"]);
    await queryInterface.addIndex("write_offs", ["createdAt"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("write_offs");
  },
};
