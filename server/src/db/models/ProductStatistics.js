const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductStatistics extends Model {
    static associate(models) {
      // Связь с товаром
      ProductStatistics.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }
  
  ProductStatistics.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      comment: 'ID товара'
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Название товара (сохраняется для истории)'
    },
    totalQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общее количество проданного товара'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общая сумма продаж товара'
    },
    totalCostAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общая себестоимость проданного товара'
    },
    orderCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Количество заказов с этим товаром'
    },
    lastOrderDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Дата последнего заказа с этим товаром'
    }
  }, {
    sequelize,
    modelName: 'ProductStatistics',
    tableName: 'product_statistics',
    timestamps: true,
    indexes: [
      {
        fields: ['productId'],
        unique: true
      },
      {
        fields: ['totalQuantity']
      },
      {
        fields: ['totalAmount']
      },
      {
        fields: ['orderCount']
      }
    ]
  });

  return ProductStatistics;
};
