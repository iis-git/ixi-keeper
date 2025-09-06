const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserProductStats extends Model {
    static associate(models) {
      // Связь с пользователем
      UserProductStats.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      
      // Связь с товаром
      UserProductStats.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product',
      });
    }
  }
  
  UserProductStats.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'ID пользователя'
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
      comment: 'Название товара (для истории, если товар будет удален)'
    },
    totalQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общее количество заказанного товара'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общая сумма заказанного товара'
    },
    totalCostAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общая себестоимость заказанного товара'
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
      comment: 'Дата последнего заказа этого товара'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'UserProductStats',
    tableName: 'user_product_stats',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'productId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['productId']
      }
    ]
  });
  
  return UserProductStats;
};
