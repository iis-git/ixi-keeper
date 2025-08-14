import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryApi } from '../../../../shared/api/category';
import { handleApiError } from '../../../../shared/api/base';
import type { Category } from '../../../../entities/category/model/types';
import styles from './CategoryForm.module.scss';

interface CategoryFormProps {
  categoryId?: number;
  initialData?: Category;
}

const predefinedColors = [
  '#646cff', '#4caf50', '#ff9800', '#f44336', '#9c27b0',
  '#2196f3', '#00bcd4', '#795548', '#607d8b', '#e91e63'
];

export const CategoryForm: FC<CategoryFormProps> = ({ categoryId, initialData }) => {
  const navigate = useNavigate();
  const isEditMode = categoryId !== undefined;
  
  const [formData, setFormData] = useState<Partial<Category>>(initialData || {
    name: '',
    description: '',
    color: '#646cff',
    isActive: true
  });
  
  const [loading, setLoading] = useState<boolean>(isEditMode && !initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && categoryId !== undefined && !initialData) {
      fetchCategory();
    }
  }, [categoryId, initialData]);

  const fetchCategory = async (): Promise<void> => {
    try {
      const response = await categoryApi.getById(categoryId!);
      setFormData(response.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить данные категории. ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    }
    
    setFormData({
      ...formData,
      [name]: processedValue
    });
  };

  const handleColorSelect = (color: string): void => {
    setFormData({
      ...formData,
      color
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    try {
      if (isEditMode && categoryId !== undefined) {
        await categoryApi.update(categoryId, formData);
      } else {
        await categoryApi.create(formData as any);
      }
      navigate('/categories');
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось сохранить категорию. ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.categoryFormContainer}>
      <h1>{isEditMode ? 'Редактирование категории' : 'Добавление новой категории'}</h1>
      
      <form onSubmit={handleSubmit} className={styles.categoryForm}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Название категории *</label>
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
            placeholder="Краткое описание категории (необязательно)"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Цвет категории</label>
          <div className={styles.colorPicker}>
            {predefinedColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.colorOption} ${formData.color === color ? styles.selected : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color}
              />
            ))}
          </div>
          <div className={styles.customColorGroup}>
            <label htmlFor="customColor">Или выберите свой цвет:</label>
            <input
              type="color"
              id="customColor"
              name="color"
              value={formData.color || '#646cff'}
              onChange={handleChange}
              className={styles.customColorInput}
            />
          </div>
        </div>

        <div className={styles.colorPreview}>
          <span>Предварительный просмотр:</span>
          <div 
            className={styles.previewBadge}
            style={{ backgroundColor: formData.color }}
          >
            {formData.name || 'Название категории'}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive || false}
              onChange={handleChange}
            />
            Категория активна
          </label>
        </div>
        
        <div className={styles.formActions}>
          <button type="button" onClick={() => navigate('/categories')} className={styles.cancelButton}>
            Отмена
          </button>
          <button type="submit" className={styles.submitButton}>
            {isEditMode ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
};
