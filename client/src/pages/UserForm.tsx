import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './UserForm.module.scss';
import { User } from '../types';

const UserForm: React.FC = () => {
  const { id } = useParams<Record<string, string | undefined>>();
  const navigate = useNavigate();
  const isEditMode = id !== undefined;
  
  const [formData, setFormData] = useState<User>({
    name: '',
    phone: '',
    totalOrdersAmount: 0,
    visitCount: 0,
    averageCheck: 0
  });
  
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async (): Promise<void> => {
    try {
      console.log(`Отправка запроса на получение пользователя с ID ${id}...`);
      const response = await axios.get<User>(`http://localhost:3020/api/users/${id}`);
      console.log('Получен ответ:', response);
      setFormData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении данных пользователя:', err);
      const error = err as Error;
      console.error('Детали ошибки:', {
        message: error.message,
        status: axios.isAxiosError(err) ? err.response?.status : undefined,
        statusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
        data: axios.isAxiosError(err) ? err.response?.data : undefined,
        url: axios.isAxiosError(err) ? err.config?.url : undefined,
        method: axios.isAxiosError(err) ? err.config?.method : undefined
      });
      setError(`Не удалось загрузить данные пользователя. Ошибка: ${error.message}`);
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
      console.log('Отправляемые данные:', formData);
      if (isEditMode && id) {
        console.log(`Отправка запроса на обновление пользователя с ID ${id}...`);
        const response = await axios.put<User>(`http://localhost:3020/api/users/${id}`, formData);
        console.log('Получен ответ на обновление:', response);
      } else {
        console.log('Отправка запроса на создание нового пользователя...');
        const response = await axios.post<User>('http://localhost:3020/api/users', formData);
        console.log('Получен ответ на создание:', response);
      }
      navigate('/users');
    } catch (err) {
      console.error('Ошибка при сохранении пользователя:', err);
      const error = err as Error;
      console.error('Детали ошибки:', {
        message: error.message,
        status: axios.isAxiosError(err) ? err.response?.status : undefined,
        statusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
        data: axios.isAxiosError(err) ? err.response?.data : undefined,
        url: axios.isAxiosError(err) ? err.config?.url : undefined,
        method: axios.isAxiosError(err) ? err.config?.method : undefined,
        requestData: formData
      });
      setError(`Не удалось сохранить пользователя. Ошибка: ${error.message}`);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.userFormContainer}>
      <h1>{isEditMode ? 'Редактирование пользователя' : 'Добавление нового пользователя'}</h1>
      
      <form onSubmit={handleSubmit} className={styles.userForm}>
        <div className={styles.formGroup}>
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
        
        <div className={styles.formGroup}>
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
        
        <div className={styles.formGroup}>
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
        
        <div className={styles.formGroup}>
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
        
        <div className={styles.formGroup}>
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
        
        <div className={styles.formActions}>
          <button type="button" onClick={() => navigate('/users')} className={styles.cancelButton}>
            Отмена
          </button>
          <button type="submit" className={styles.submitButton}>
            {isEditMode ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserForm;
