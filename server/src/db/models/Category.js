const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Определяем связи с другими моделями
      Category.hasMany(models.Product, {
        foreignKey: 'categoryId',
        as: 'products',
      });
    }
  }
  
  Category.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#646cff',
      comment: 'Цвет категории для UI'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    modelName: 'Category',
    tableName: 'categories',
  });
  
  return Category;
};
