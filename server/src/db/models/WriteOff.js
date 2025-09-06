const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WriteOff extends Model {
    static associate(models) {
      WriteOff.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
      WriteOff.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    }
  }

  WriteOff.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'WriteOff',
      tableName: 'write_offs',
    }
  );

  return WriteOff;
};
