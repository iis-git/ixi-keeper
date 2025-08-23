const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      // Определяем связи с другими моделями
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      
      Order.belongsToMany(models.Product, {
        through: 'OrderProducts',
        foreignKey: 'orderId',
        as: 'products',
      });
    }
  }
  
  Order.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    guestName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Имя гостя для заказа'
    },
    orderItems: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Список позиций в заказе с количеством и ценами'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Общая сумма заказа'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
      defaultValue: 'active',
      comment: 'Статус заказа: активный, завершенный, отмененный'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'transfer'),
      allowNull: true,
      comment: 'Способ оплаты: наличные, карта, перевод'
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Комментарий к заказу'
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Дата и время закрытия заказа'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'ID пользователя (опционально, для совместимости)'
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
    modelName: 'Order',
    tableName: 'orders',
  });
  
  return Order;
};
