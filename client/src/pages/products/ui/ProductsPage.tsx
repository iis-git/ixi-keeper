import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../../shared/api/product';
import { categoryApi } from '../../../shared/api/category';
import { handleApiError } from '../../../shared/api/base';
import { IngredientsManager } from '../../../features/product/ingredients';
import type { Product } from '../../../entities/product/model/types';
import type { Category } from '../../../entities/category/model/types';
import styles from './ProductsPage.module.scss';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [ingredientsModalProductId, setIngredientsModalProductId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        productApi.getAll(),
        categoryApi.getAll()
      ]);
      
      setProducts(productsResponse.data);
      setCategories(categoriesResponse.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить данные. ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      try {
        await productApi.delete(id);
        fetchData(); // Обновляем список после удаления
      } catch (err: any) {
        const errorMessage = handleApiError(err);
        setError(`Не удалось удалить товар. ${errorMessage}`);
      }
    }
  };

  const filteredProducts = selectedCategory 
    ? products.filter(product => product.categoryId === selectedCategory)
    : products;

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.productsContainer}>
      <div className={styles.productsHeader}>
        <h1>Товары</h1>
        <div className={styles.headerActions}>
          <Link to="/categories" className={styles.categoriesButton}>
            Управление категориями
          </Link>
          <Link to="/products/new" className={styles.addButton}>
            Добавить товар
          </Link>
        </div>
      </div>

      {/* Фильтр по категориям */}
      <div className={styles.categoryFilter}>
        <button 
          className={`${styles.categoryFilterButton} ${selectedCategory === null ? styles.active : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          Все категории
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={`${styles.categoryFilterButton} ${selectedCategory === category.id ? styles.active : ''}`}
            onClick={() => setSelectedCategory(category.id)}
            style={{ backgroundColor: category.color }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {filteredProducts.length > 0 ? (
        <div className={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.productHeader}>
                <h3>{product.name}</h3>
                {product.category && (
                  <span 
                    className={styles.categoryBadge}
                    style={{ backgroundColor: product.category.color }}
                  >
                    {product.category.name}
                  </span>
                )}
              </div>
              
              {product.description && (
                <p className={styles.productDescription}>{product.description}</p>
              )}
              
              <div className={styles.productInfo}>
                <div className={styles.priceInfo}>
                  <span className={styles.price}>{product.price} ₽</span>
                  {product.isComposite && (
                    <span className={styles.compositeLabel}>Коктейль</span>
                  )}
                </div>
                <div className={styles.stockInfo}>
                  {product.isComposite ? (
                    <>
                      <span className={styles.stock}>
                        Доступно порций: {product.calculatedStock || 0}
                      </span>
                      <span className={styles.unitSize}>
                        Ингредиентов: {product.ingredients?.length || 0}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={styles.stock}>
                        Остаток: {product.stock} {product.unit}
                      </span>
                      <span className={styles.unitSize}>
                        Списание: {product.unitSize} {product.unit}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className={styles.productActions}>
                <Link to={`/products/edit/${product.id}`} className={styles.editButton}>
                  Изменить
                </Link>
                {product.isComposite && (
                  <button 
                    onClick={() => setIngredientsModalProductId(product.id)} 
                    className={styles.ingredientsButton}
                  >
                    Ингредиенты
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(product.id)} 
                  className={styles.deleteButton}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noProducts}>
          {selectedCategory ? 'В выбранной категории товары не найдены.' : 'Товары не найдены.'}
        </p>
      )}

      {/* Модальное окно управления ингредиентами */}
      {ingredientsModalProductId && (
        <IngredientsManager
          productId={ingredientsModalProductId}
          onClose={() => {
            setIngredientsModalProductId(null);
            fetchData(); // Обновляем данные после изменения ингредиентов
          }}
        />
      )}
    </div>
  );
};

export default ProductsPage;
