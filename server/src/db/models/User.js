const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Определяем связи с другими моделями
      User.hasMany(models.Order, {
        foreignKey: 'userId',
        as: 'orders',
      });
    }
  }
  
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalOrdersAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    visitCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    averageCheck: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
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
    modelName: 'User',
    tableName: 'users',
  });
  
  return User;
};
