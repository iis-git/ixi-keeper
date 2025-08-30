const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // Определяем связи с другими моделями
      Product.belongsToMany(models.Order, {
        through: 'OrderProducts',
        foreignKey: 'productId',
        as: 'orders',
      });
      
      Product.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category',
      });

      // Связи для составных товаров (коктейлей)
      // Составной товар имеет много ингредиентов
      Product.hasMany(models.ProductIngredient, {
        foreignKey: 'compositeProductId',
        as: 'ingredients',
      });

      // Товар может быть ингредиентом в составных товарах
      Product.hasMany(models.ProductIngredient, {
        foreignKey: 'ingredientProductId',
        as: 'usedInComposites',
      });
    }
  }
  
  Product.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Себестоимость товара'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Поле для управления порядком отображения'
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    stock: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Общее количество на складе'
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Порог остатка для оповещения (0/NULL = отключено)'
    },
    unitSize: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 1,
      comment: 'Количество единиц товара, списываемых при продаже одной позиции'
    },
    unit: {
      type: DataTypes.STRING,
      defaultValue: 'шт',
      comment: 'Единица измерения (шт, кг, л и т.д.)'
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#646cff',
      allowNull: false,
      comment: 'Цвет товара для UI'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isComposite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Является ли товар составным (коктейлем)'
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
    modelName: 'Product',
    tableName: 'products',
  });
  
  return Product;
};
