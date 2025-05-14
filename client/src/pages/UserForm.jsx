import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/UserForm.css';

function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = id !== undefined;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    totalOrdersAmount: 0,
    visitCount: 0,
    averageCheck: 0
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      console.log(`Отправка запроса на получение пользователя с ID ${id}...`);
      const response = await axios.get(`http://localhost:3000/api/users/${id}`);
      console.log('Получен ответ:', response);
      setFormData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении данных пользователя:', err);
      console.error('Детали ошибки:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method
      });
      setError(`Не удалось загрузить данные пользователя. Ошибка: ${err.message}`);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'name' || name === 'phone' ? value : Number(value)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Отправляемые данные:', formData);
      if (isEditMode) {
        console.log(`Отправка запроса на обновление пользователя с ID ${id}...`);
        const response = await axios.put(`http://localhost:3000/api/users/${id}`, formData);
        console.log('Получен ответ на обновление:', response);
      } else {
        console.log('Отправка запроса на создание нового пользователя...');
        const response = await axios.post('http://localhost:3000/api/users', formData);
        console.log('Получен ответ на создание:', response);
      }
      navigate('/users');
    } catch (err) {
      console.error('Ошибка при сохранении пользователя:', err);
      console.error('Детали ошибки:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
        requestData: formData
      });
      setError(`Не удалось сохранить пользователя. Ошибка: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="user-form-container">
      <h1>{isEditMode ? 'Редактирование пользователя' : 'Добавление нового пользователя'}</h1>
      
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
    </div>
  );
}

export default UserForm;
