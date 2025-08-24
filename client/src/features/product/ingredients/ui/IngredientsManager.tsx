import React, { useState, useEffect, FC } from 'react';
import { Button } from 'antd';
import { ProductIngredient, Product } from '../../../../entities/product/model/types';
import { productApi } from '../../../../shared/api/product';
import { handleApiError } from '../../../../shared/api/base';
import styles from './IngredientsManager.module.scss';

// Утилиты для форматирования чисел
const formatNumberForDisplay = (num: number): string => {
  return num.toString().replace('.', ',');
};

const parseNumberFromDisplay = (str: string): number => {
  return parseFloat(str.replace(',', '.'));
};

interface IngredientsManagerProps {
  productId: number;
  onClose: () => void;
}

export const IngredientsManager: FC<IngredientsManagerProps> = ({ productId, onClose }) => {
  const [ingredients, setIngredients] = useState<ProductIngredient[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchIngredients();
    fetchAvailableProducts();
  }, [productId]);

  const fetchIngredients = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await productApi.ingredients.getByProductId(productId);
      setIngredients(response.data);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить ингредиенты. ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async (): Promise<void> => {
    try {
      const response = await productApi.getAll();
      // Исключаем составные товары и текущий товар из списка доступных ингредиентов
      const filtered = response.data.filter(
        (product: Product) => 
          !product.isComposite && 
          product.isActive && 
          product.id !== productId
      );
      setAvailableProducts(filtered);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить товары. ${errorMessage}`);
    }
  };

  const formatNumberForDisplay = (value: number): string => {
    return value.toString().replace('.', ',');
  };

  const parseNumberFromInput = (value: string): number => {
    return parseFloat(value.replace(',', '.')) || 0;
  };

  const handleAddIngredient = async (): Promise<void> => {
    if (!selectedProductId || !quantity) {
      setError('Выберите товар и укажите количество');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const parsedQuantity = parseNumberFromInput(quantity);
      if (parsedQuantity <= 0) {
        setError('Количество должно быть больше нуля');
        return;
      }

      await productApi.ingredients.create(productId, {
        ingredientProductId: Number(selectedProductId),
        quantity: parsedQuantity
      });

      setSelectedProductId('');
      setQuantity('');
      await fetchIngredients();
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось добавить ингредиент. ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (ingredientId: number, newQuantity: string): Promise<void> => {
    const parsedQuantity = parseNumberFromInput(newQuantity);
    if (parsedQuantity <= 0) return;

    try {
      await productApi.ingredients.update(productId, ingredientId, {
        quantity: parsedQuantity
      });
      await fetchIngredients();
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось обновить количество. ${errorMessage}`);
    }
  };

  const handleDeleteIngredient = async (ingredientId: number): Promise<void> => {
    if (!confirm('Удалить ингредиент из состава?')) return;

    try {
      await productApi.ingredients.delete(productId, ingredientId);
      await fetchIngredients();
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось удалить ингредиент. ${errorMessage}`);
    }
  };

  const getAvailablePortions = (ingredient: ProductIngredient): number => {
    return Math.floor(ingredient.ingredientProduct.stock / ingredient.quantity);
  };

  const getMinAvailablePortions = (): number => {
    if (ingredients.length === 0) return 0;
    return Math.min(...ingredients.map(getAvailablePortions));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Управление ингредиентами</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.content}>
          <div className={styles.addSection}>
            <h3>Добавить ингредиент</h3>
            <div className={styles.addForm}>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={loading}
              >
                <option value="">Выберите товар</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (остаток: {formatNumberForDisplay(product.stock)} {product.unit})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Количество"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                pattern="[0-9]+([,\.][0-9]+)?"
                disabled={loading}
              />

              <Button
                type="primary"
                size='large'
                onClick={handleAddIngredient}
                disabled={loading || !selectedProductId || !quantity}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Добавить
              </Button>
            </div>
          </div>

          <div className={styles.ingredientsList}>
            <h3>Состав товара</h3>
            {ingredients.length === 0 ? (
              <p className={styles.emptyMessage}>Ингредиенты не добавлены</p>
            ) : (
              <>
                <div className={styles.summary}>
                  <strong>Доступно порций: {getMinAvailablePortions()}</strong>
                </div>
                <div className={styles.ingredients}>
                  {ingredients.map((ingredient) => (
                    <div key={ingredient.id} className={styles.ingredient}>
                      <div className={styles.ingredientInfo}>
                        <span className={styles.name}>{ingredient.ingredientProduct.name}</span>
                        <span className={styles.stock}>
                          Остаток: {formatNumberForDisplay(ingredient.ingredientProduct.stock)} {ingredient.ingredientProduct.unit}
                        </span>
                        <span className={styles.portions}>
                          Порций: {getAvailablePortions(ingredient)}
                        </span>
                      </div>
                      
                      <div className={styles.quantityControl}>
                        <input
                          type="text"
                          value={formatNumberForDisplay(ingredient.quantity)}
                          onChange={(e) => handleUpdateQuantity(ingredient.id, e.target.value)}
                          onBlur={(e) => handleUpdateQuantity(ingredient.id, e.target.value)}
                          className={styles.quantityInput}
                          pattern="[0-9]+([,\.][0-9]+)?"
                        />
                        <span className={styles.unit}>{ingredient.ingredientProduct.unit}</span>
                      </div>

                      <button
                        onClick={() => handleDeleteIngredient(ingredient.id)}
                        className={styles.deleteButton}
                        title="Удалить ингредиент"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button 
            type="primary"
            size="large"
            onClick={onClose}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Готово
          </Button>
        </div>
      </div>
    </div>
  );
};
