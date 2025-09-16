module.exports = (sequelize, DataTypes) => {
  const ShiftBartender = sequelize.define('ShiftBartender', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shiftId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'shift_bartenders'
  });

  ShiftBartender.associate = (models) => {
    ShiftBartender.belongsTo(models.Shift, { as: 'shift', foreignKey: 'shiftId' });
    ShiftBartender.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
  };

  return ShiftBartender;
};
