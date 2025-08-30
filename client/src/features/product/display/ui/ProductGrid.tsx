import React, { useState, useEffect } from 'react';
import { productApi } from '../../../../shared/api/product';
import { categoryApi } from '../../../../shared/api/category';
import { handleApiError } from '../../../../shared/api/base';
import type { Product } from '../../../../entities/product/model/types';
import type { Category } from '../../../../entities/category/model/types';
import styles from './ProductGrid.module.scss';

interface ProductGridProps {
  onProductClick?: (product: Product) => void;
  selectedCategoryId?: number | null;
  refreshTrigger?: number; // Триггер для принудительного обновления
}

export const ProductGrid: React.FC<ProductGridProps> = ({ 
  onProductClick, 
  selectedCategoryId,
  refreshTrigger 
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<number | null>(selectedCategoryId || null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentCategory(selectedCategoryId || null);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (refreshTrigger) {
      fetchData();
    }
  }, [refreshTrigger]);

  const fetchData = async (): Promise<void> => {
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        productApi.getAll(),
        categoryApi.getAll()
      ]);
      
      setProducts(productsResponse.data.filter(p => p.isActive));
      setCategories(categoriesResponse.data.filter(c => c.isActive));
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить товары. ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    if (onProductClick) {
      onProductClick(product);
    }
  };

  const filteredProducts = currentCategory 
    ? products.filter(product => product.categoryId === currentCategory)
    : products;

  if (loading) {
    return <div className={styles.loading}>Загрузка товаров...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.productGridContainer}>
      {/* Фильтр по категориям */}
      <div className={styles.categoryTabs}>
        <button 
          className={`${styles.categoryTab} ${currentCategory === null ? styles.active : ''}`}
          onClick={() => setCurrentCategory(null)}
        >
          Все товары
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={`${styles.categoryTab} ${currentCategory === category.id ? styles.active : ''}`}
            onClick={() => setCurrentCategory(category.id)}
            style={{ 
              backgroundColor: currentCategory === category.id ? category.color : 'transparent',
              borderColor: category.color,
              color: currentCategory === category.id ? 'white' : category.color
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Сетка товаров */}
      {filteredProducts.length > 0 ? (
        <div className={styles.productGrid}>
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              className={`${styles.productButton} ${
                (product.isComposite ? 
                  (product.calculatedStock === undefined || product.calculatedStock <= 0) : 
                  product.stock <= 0
                ) ? styles.outOfStock : ''
              } ${(() => {
                const threshold = typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : undefined;
                if (!threshold || threshold <= 0) return '';
                if (product.isComposite) {
                  const portions = typeof product.calculatedStock === 'number' ? product.calculatedStock : (typeof product.availablePortions === 'number' ? product.availablePortions : undefined);
                  return typeof portions === 'number' && portions <= threshold ? styles.lowStock : '';
                } else {
                  const unitSize = Number((product as any).unitSize) || 1;
                  const stockNum = Number((product as any).stock);
                  const hasStock = Number.isFinite(stockNum);
                  const positions = hasStock && unitSize > 0 ? Math.floor(stockNum / unitSize) : undefined;
                  return typeof positions === 'number' && positions <= threshold ? styles.lowStock : '';
                }
              })()}`}
              onClick={() => handleProductClick(product)}
              disabled={
                product.isComposite ? 
                  (product.calculatedStock === undefined || product.calculatedStock <= 0) : 
                  product.stock <= 0
              }
            >
              <div 
                className={styles.productButtonContent}
                style={{ backgroundColor: product.color || '#646cff' }}
              >
                <div className={styles.productName}>{product.name}</div>
                
                <div className={styles.productStock}>
                  {product.isComposite ? (
                    // Для составных товаров показываем рассчитанное количество
                    product.calculatedStock !== undefined && product.calculatedStock > 0 ? (
                      <span className={styles.inStock}>
                        Остаток: {product.calculatedStock}
                      </span>
                    ) : (
                      <span className={styles.noStock}>Недостаточно ингредиентов</span>
                    )
                  ) : (
                    // Для обычных товаров показываем остаток
                    product.stock > 0 ? (
                      <span className={styles.inStock}>
                        Остаток: {Math.round(Number(product.stock))} {product.unit}
                      </span>
                    ) : (
                      <span className={styles.noStock}>Нет в наличии</span>
                    )
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.noProducts}>
          {currentCategory ? 'В выбранной категории товары не найдены' : 'Товары не найдены'}
        </div>
      )}
    </div>
  );
};
