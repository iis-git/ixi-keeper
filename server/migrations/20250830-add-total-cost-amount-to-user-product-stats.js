'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_product_stats', 'totalCostAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общая себестоимость заказанного товара'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_product_stats', 'totalCostAmount');
  }
};
