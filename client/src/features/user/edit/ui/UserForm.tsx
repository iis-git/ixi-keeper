import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../../../entities/user/model/types';
import { userApi } from '../../../../shared/api/user';
import { handleApiError } from '../../../../shared/api/base';

interface UserFormProps {
  userId?: number;
  initialData?: User;
}

export const UserForm: FC<UserFormProps> = ({ userId, initialData }) => {
  const navigate = useNavigate();
  const isEditMode = userId !== undefined;
  
  const [formData, setFormData] = useState<User>(initialData || {
    name: '',
    phone: '',
    totalOrdersAmount: 0,
    visitCount: 0,
    averageCheck: 0
  });
  
  const [loading, setLoading] = useState<boolean>(isEditMode && !initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && userId !== undefined && !initialData) {
      fetchUser();
    }
  }, [userId, initialData]);

  const fetchUser = async (): Promise<void> => {
    try {
      const response = await userApi.getById(userId!);
      setFormData(response.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить данные пользователя. ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'name' || name === 'phone' ? value : Number(value)
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    try {
      if (isEditMode && userId !== undefined) {
        await userApi.update(userId, formData);
      } else {
        await userApi.create(formData);
      }
      navigate('/users');
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось сохранить пользователя. ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <div className="form-group">
        <label htmlFor="name">Имя</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="phone">Номер телефона</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="totalOrdersAmount">Сумма заказов</label>
        <input
          type="number"
          id="totalOrdersAmount"
          name="totalOrdersAmount"
          value={formData.totalOrdersAmount}
          onChange={handleChange}
          min="0"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="visitCount">Количество посещений</label>
        <input
          type="number"
          id="visitCount"
          name="visitCount"
          value={formData.visitCount}
          onChange={handleChange}
          min="0"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="averageCheck">Средний чек</label>
        <input
          type="number"
          id="averageCheck"
          name="averageCheck"
          value={formData.averageCheck}
          onChange={handleChange}
          min="0"
        />
      </div>
      
      <div className="form-actions">
        <button type="button" onClick={() => navigate('/users')} className="cancel-button">
          Отмена
        </button>
        <button type="submit" className="submit-button">
          {isEditMode ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </form>
  );
};
