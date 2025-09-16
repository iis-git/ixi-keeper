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
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isDebtor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    discountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Постоянная скидка пользователя в процентах'
    },
    guestType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'guest',
      comment: 'Тип гостя: owner | guest | regular | bartender'
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
