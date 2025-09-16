module.exports = (sequelize, DataTypes) => {
  const Shift = sequelize.define('Shift', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    openedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    openedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
    openingNote: { type: DataTypes.TEXT, allowNull: true },
    closingNote: { type: DataTypes.TEXT, allowNull: true },
    openingCashAmount: { type: DataTypes.DECIMAL(10,2), allowNull: true, defaultValue: null },
    closingCashAmount: { type: DataTypes.DECIMAL(10,2), allowNull: true, defaultValue: null },
    summary: { type: DataTypes.JSONB, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'shifts'
  });

  Shift.associate = (models) => {
    Shift.belongsTo(models.User, { as: 'openedBy', foreignKey: 'openedByUserId' });
    Shift.hasMany(models.ShiftBartender, { as: 'bartenders', foreignKey: 'shiftId' });
    Shift.hasMany(models.Order, { as: 'orders', foreignKey: 'shiftId' });
  };

  return Shift;
};
