const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductIngredient extends Model {
    static associate(models) {
      // Составной товар (коктейль)
      ProductIngredient.belongsTo(models.Product, {
        foreignKey: 'compositeProductId',
        as: 'compositeProduct',
      });
      
      // Ингредиент (базовый товар)
      ProductIngredient.belongsTo(models.Product, {
        foreignKey: 'ingredientProductId',
        as: 'ingredientProduct',
      });
    }
  }
  
  ProductIngredient.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    compositeProductId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      comment: 'ID составного товара (коктейля)'
    },
    ingredientProductId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      comment: 'ID товара-ингредиента'
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Количество ингредиента, необходимое для одной порции составного товара'
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
    modelName: 'ProductIngredient',
    tableName: 'product_ingredients',
    indexes: [
      {
        unique: true,
        fields: ['compositeProductId', 'ingredientProductId'],
        name: 'unique_composite_ingredient'
      }
    ]
  });
  
  return ProductIngredient;
};
