import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../../../../shared/api/product';
import { categoryApi } from '../../../../shared/api/category';
import { handleApiError } from '../../../../shared/api/base';
import type { Product, ProductIngredient } from '../../../../entities/product/model/types';
import type { Category } from '../../../../entities/category/model/types';
import styles from './ProductForm.module.scss';

interface ProductFormProps {
  productId?: number;
  initialData?: Product;
}

export const ProductForm: FC<ProductFormProps> = ({ productId, initialData }) => {
  const navigate = useNavigate();
  const isEditMode = productId !== undefined;
  
  const [formData, setFormData] = useState<any>(initialData || {
    name: '',
    description: '',
    price: '',
    categoryId: undefined,
    stock: '',
    unitSize: '1',
    unit: 'шт',
    color: '#646cff',
    isActive: true,
    isComposite: false
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Array<{id?: number, ingredientProductId: number, quantity: string}>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategories();
    fetchAvailableProducts();
    if (isEditMode && productId !== undefined && !initialData) {
      fetchProduct();
    }
  }, [productId, initialData]);

  useEffect(() => {
    // Загружаем ингредиенты для редактируемого составного товара
    if (isEditMode && productId && formData.isComposite) {
      fetchIngredients();
    }
  }, [isEditMode, productId, formData.isComposite]);

  const fetchCategories = async (): Promise<void> => {
    try {
      const response = await categoryApi.getAll();
      setCategories(response.data.filter((c: Category) => c.isActive));
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить категории. ${errorMessage}`);
    }
  };

  const fetchProduct = async (): Promise<void> => {
    try {
      const response = await productApi.getById(productId!);
      setFormData(response.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить данные товара. ${errorMessage}`);
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

  const fetchIngredients = async (): Promise<void> => {
    if (!productId) return;
    
    try {
      const response = await productApi.ingredients.getByProductId(productId);
      const formattedIngredients = response.data.map((ingredient: ProductIngredient) => ({
        id: ingredient.id,
        ingredientProductId: ingredient.ingredientProductId,
        quantity: ingredient.quantity.toString().replace('.', ',')
      }));
      setIngredients(formattedIngredients);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить ингредиенты. ${errorMessage}`);
    }
  };

  // Функция валидации числового поля
  const validateNumberField = (value: string, fieldName: string): string | null => {
    if (!value.trim()) {
      return `${fieldName} обязательно для заполнения`;
    }
    
    // Заменяем запятые на точки для проверки
    const normalizedValue = value.replace(',', '.');
    const number = parseFloat(normalizedValue);
    
    if (isNaN(number)) {
      return `${fieldName} должно быть числом`;
    }
    
    if (number < 0) {
      return `${fieldName} не может быть отрицательным`;
    }
    
    return null;
  };

  // Функция для округления числа до 2 знаков после запятой
  const formatNumberToTwoDecimals = (value: string): string => {
    if (!value.trim()) return value;
    
    const normalizedValue = value.replace(',', '.');
    const number = parseFloat(normalizedValue);
    
    if (isNaN(number)) return value;
    
    // Округляем до 2 знаков и возвращаем с запятой
    return number.toFixed(2).replace('.', ',');
  };

  // Функции для управления ингредиентами
  const addIngredient = (): void => {
    setIngredients([...ingredients, { ingredientProductId: 0, quantity: '' }]);
  };

  const removeIngredient = (index: number): void => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: 'ingredientProductId' | 'quantity', value: string | number): void => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const formatNumberForDisplay = (value: number): string => {
    return value.toString().replace('.', ',');
  };

  const parseNumberFromInput = (value: string): number => {
    return parseFloat(value.replace(',', '.')) || 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    // Для числовых полей сохраняем как строку, валидируем отдельно
    if (name === 'price' || name === 'stock' || name === 'unitSize') {
      processedValue = value; // Сохраняем как строку
      
      // Валидируем поле
      const fieldNames = {
        price: 'Цена',
        stock: 'Остаток',
        unitSize: 'Размер единицы'
      };
      
      const error = validateNumberField(value, fieldNames[name as keyof typeof fieldNames]);
      setValidationErrors(prev => ({
        ...prev,
        [name]: error || ''
      }));
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'categoryId') {
      processedValue = value === '' ? undefined : Number(value);
    }
    
    setFormData({
      ...formData,
      [name]: processedValue
    });
  };

  // Обработчик для потери фокуса - округляем числа
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    
    if (name === 'price' || name === 'stock' || name === 'unitSize') {
      const formattedValue = formatNumberToTwoDecimals(value);
      if (formattedValue !== value) {
        setFormData({
          ...formData,
          [name]: formattedValue
        });
      }
    }
  };



  // Проверяем, есть ли ошибки валидации
  const hasValidationErrors = (): boolean => {
    return Object.values(validationErrors).some(error => error !== '');
  };

  // Проверяем, заполнены ли обязательные поля
  const hasRequiredFields = (): boolean => {
    // Для составных товаров остаток на складе не требуется
    if (formData.isComposite) {
      return !!(formData.name && formData.price && formData.unitSize);
    }
    return !!(formData.name && formData.price && formData.stock && formData.unitSize);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Проверяем валидацию перед отправкой
    if (hasValidationErrors() || !hasRequiredFields()) {
      setError('Пожалуйста, исправьте ошибки в форме');
      return;
    }
    
    try {
      setLoading(true);
      
      // Подготавливаем данные для отправки, конвертируем строки в числа
      const dataToSend = {
        ...formData,
        price: parseFloat((formData.price as string).replace(',', '.')),
        stock: formData.isComposite ? 0 : parseFloat((formData.stock as string).replace(',', '.')),
        unitSize: parseFloat((formData.unitSize as string).replace(',', '.')),
        categoryId: formData.categoryId || undefined,
        isComposite: Boolean(formData.isComposite)
      };
      
      // Логируем данные для отладки
      console.log('Отправляемые данные:', dataToSend);
      
      let savedProductId: number;
      
      if (isEditMode && productId !== undefined) {
        await productApi.update(productId, dataToSend);
        savedProductId = productId;
      } else {
        const response = await productApi.create(dataToSend as any);
        savedProductId = response.data.id;
      }

      // Сохраняем ингредиенты для составных товаров
      if (formData.isComposite && ingredients.length > 0) {
        // Удаляем старые ингредиенты при редактировании
        if (isEditMode) {
          const existingIngredients = await productApi.ingredients.getByProductId(savedProductId);
          for (const ingredient of existingIngredients.data) {
            await productApi.ingredients.delete(savedProductId, ingredient.id);
          }
        }

        // Добавляем новые ингредиенты
        for (const ingredient of ingredients) {
          if (ingredient.ingredientProductId && ingredient.quantity) {
            await productApi.ingredients.create(savedProductId, {
              ingredientProductId: ingredient.ingredientProductId,
              quantity: parseNumberFromInput(ingredient.quantity)
            });
          }
        }
      }
      
      navigate('/products');
    } catch (err: any) {
      console.error('Ошибка при сохранении товара:', err);
      const errorMessage = handleApiError(err);
      setError(`Не удалось сохранить товар. ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.productFormContainer}>
      <h1>{isEditMode ? 'Редактирование товара' : 'Добавление нового товара'}</h1>
      
      <form onSubmit={handleSubmit} className={styles.productForm}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Название товара *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="price">Цена *</label>
            <input
              type="text"
              id="price"
              name="price"
              value={formData.price || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0,00"
              className={validationErrors.price ? styles.inputError : ''}
            />
            {validationErrors.price && (
              <span className={styles.errorText}>{validationErrors.price}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="categoryId">Категория</label>
            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId || ''}
              onChange={handleChange}
            >
              <option value="">Без категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          {/* Скрываем поле остатка для составных товаров */}
          {!formData.isComposite && (
            <div className={styles.formGroup}>
              <label htmlFor="stock">Остаток на складе *</label>
              <input
                type="text"
                id="stock"
                name="stock"
                value={formData.stock || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0,00"
                className={validationErrors.stock ? styles.inputError : ''}
              />
              {validationErrors.stock && (
                <span className={styles.errorText}>{validationErrors.stock}</span>
              )}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="unit">Единица измерения</label>
            <select
              id="unit"
              name="unit"
              value={formData.unit || 'шт'}
              onChange={handleChange}
            >
              <option value="шт">шт</option>
              <option value="кг">кг</option>
              <option value="л">л</option>
              <option value="м">м</option>
              <option value="м²">м²</option>
              <option value="м³">м³</option>
              <option value="упак">упак</option>
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="unitSize">Количество списания за единицу *</label>
          <input
            type="text"
            id="unitSize"
            name="unitSize"
            value={formData.unitSize || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="1,000"
            className={validationErrors.unitSize ? styles.inputError : ''}
          />
          {validationErrors.unitSize && (
            <span className={styles.errorText}>{validationErrors.unitSize}</span>
          )}
          <small className={styles.helpText}>
            Сколько единиц товара будет списано при продаже одной позиции
          </small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="color">Цвет товара</label>
          <div className={styles.colorInputGroup}>
            <input
              type="color"
              id="color"
              name="color"
              value={formData.color || '#646cff'}
              onChange={handleChange}
              className={styles.colorInput}
            />
            <input
              type="text"
              name="color"
              value={formData.color || '#646cff'}
              onChange={handleChange}
              placeholder="#646cff"
              className={styles.colorTextInput}
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
          <small className={styles.helpText}>
            Цвет фона кнопки товара в интерфейсе выбора
          </small>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive || false}
              onChange={handleChange}
            />
            Товар активен
          </label>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="isComposite"
              checked={formData.isComposite || false}
              onChange={handleChange}
            />
            Составной товар (коктейль)
          </label>
          <small className={styles.helpText}>
            Составной товар состоит из других товаров-ингредиентов. При заказе будут списываться ингредиенты.
          </small>
        </div>

        {/* Секция ингредиентов для составных товаров */}
        {formData.isComposite && (
          <div className={styles.ingredientsSection}>
            <div className={styles.ingredientsHeader}>
              <h3>Состав товара</h3>
              <button
                type="button"
                onClick={addIngredient}
                className={styles.addIngredientButton}
              >
                + Добавить ингредиент
              </button>
            </div>

            {ingredients.length === 0 ? (
              <p className={styles.noIngredients}>
                Ингредиенты не добавлены. Нажмите "+" чтобы добавить первый ингредиент.
              </p>
            ) : (
              <div className={styles.ingredientsList}>
                {ingredients.map((ingredient, index) => (
                  <div key={index} className={styles.ingredientRow}>
                    <div className={styles.ingredientSelect}>
                      <select
                        value={ingredient.ingredientProductId || ''}
                        onChange={(e) => updateIngredient(index, 'ingredientProductId', Number(e.target.value))}
                        required
                      >
                        <option value="">Выберите товар</option>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (остаток: {formatNumberForDisplay(product.stock)} {product.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.ingredientQuantity}>
                      <input
                        type="text"
                        placeholder="Количество"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        pattern="[0-9]+([,\.][0-9]+)?"
                        required
                      />
                      <span className={styles.quantityUnit}>
                        {ingredient.ingredientProductId ? 
                          availableProducts.find(p => p.id === ingredient.ingredientProductId)?.unit || 'ед.' 
                          : 'ед.'
                        }
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className={styles.removeIngredientButton}
                      title="Удалить ингредиент"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={hasValidationErrors() || !hasRequiredFields()}
          >
            {isEditMode ? 'Сохранить изменения' : 'Создать товар'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/products')}
            className={styles.cancelButton}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};
