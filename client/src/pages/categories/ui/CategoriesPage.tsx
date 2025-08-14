import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi } from '../../../shared/api/category';
import { handleApiError } from '../../../shared/api/base';
import type { Category } from '../../../entities/category/model/types';
import styles from './CategoriesPage.module.scss';

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (): Promise<void> => {
    try {
      const response = await categoryApi.getAll();
      setCategories(response.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить категории. ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      try {
        await categoryApi.delete(id);
        fetchCategories(); // Обновляем список после удаления
      } catch (err: any) {
        const errorMessage = handleApiError(err);
        setError(`Не удалось удалить категорию. ${errorMessage}`);
      }
    }
  };

  const toggleActive = async (category: Category): Promise<void> => {
    try {
      await categoryApi.update(category.id, { isActive: !category.isActive });
      fetchCategories(); // Обновляем список после изменения
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось изменить статус категории. ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.categoriesContainer}>
      <div className={styles.categoriesHeader}>
        <h1>Управление категориями</h1>
        <div className={styles.headerActions}>
          <Link to="/products" className={styles.backButton}>
            ← К товарам
          </Link>
          <Link to="/categories/new" className={styles.addButton}>
            Добавить категорию
          </Link>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className={styles.categoriesGrid}>
          {categories.map((category) => (
            <div key={category.id} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <div 
                  className={styles.categoryColor}
                  style={{ backgroundColor: category.color }}
                ></div>
                <div className={styles.categoryInfo}>
                  <h3>{category.name}</h3>
                  <span className={`${styles.status} ${category.isActive ? styles.active : styles.inactive}`}>
                    {category.isActive ? 'Активна' : 'Неактивна'}
                  </span>
                </div>
              </div>
              
              {category.description && (
                <p className={styles.categoryDescription}>{category.description}</p>
              )}
              
              <div className={styles.categoryStats}>
                <span className={styles.productCount}>
                  Товаров: {category.products?.length || 0}
                </span>
              </div>
              
              <div className={styles.categoryActions}>
                <button 
                  onClick={() => toggleActive(category)}
                  className={`${styles.toggleButton} ${category.isActive ? styles.deactivate : styles.activate}`}
                >
                  {category.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
                <Link to={`/categories/edit/${category.id}`} className={styles.editButton}>
                  Изменить
                </Link>
                <button 
                  onClick={() => handleDelete(category.id)} 
                  className={styles.deleteButton}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noCategories}>
          <p>Категории не найдены.</p>
          <Link to="/categories/new" className={styles.createFirstButton}>
            Создать первую категорию
          </Link>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
