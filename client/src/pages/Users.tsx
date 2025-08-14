import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import styles from './Users.module.scss';
import { User } from '../types';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (): Promise<void> => {
    try {
      console.log('Отправка запроса на получение пользователей...');
      const response = await axios.get<User[]>('http://localhost:3020/api/users');
      console.log('Получен ответ:', response);
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении данных:', err);
      const error = err as Error;
      console.error('Детали ошибки:', {
        message: error.message,
        status: axios.isAxiosError(err) ? err.response?.status : undefined,
        statusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
        data: axios.isAxiosError(err) ? err.response?.data : undefined
      });
      setError(`Не удалось загрузить пользователей. Ошибка: ${error.message}`);
      setLoading(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        console.log(`Отправка запроса на удаление пользователя с ID ${id}...`);
        const response = await axios.delete(`http://localhost:3020/api/users/${id}`);
        console.log('Ответ на удаление:', response);
        fetchUsers(); // Обновляем список после удаления
      } catch (err) {
        console.error('Ошибка при удалении пользователя:', err);
        const error = err as Error;
        console.error('Детали ошибки:', {
          message: error.message,
          status: axios.isAxiosError(err) ? err.response?.status : undefined,
          statusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
          data: axios.isAxiosError(err) ? err.response?.data : undefined
        });
        setError(`Не удалось удалить пользователя. Ошибка: ${error.message}`);
      }
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.usersContainer}>
      <div className={styles.usersHeader}>
        <h1>Пользователи</h1>
        <Link to="/users/new" className={styles.addButton}>Добавить пользователя</Link>
      </div>

      {users.length > 0 ? (
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Сумма заказов</th>
              <th>Количество посещений</th>
              <th>Средний чек</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={index}>
                <td>{index}</td>
                <td>{user.name}</td>
                <td>{user.phone}</td>
                <td>{user.totalOrdersAmount}</td>
                <td>{user.visitCount}</td>
                <td>{user.averageCheck}</td>
                <td className={styles.actions}>
                  <Link to={`/users/edit/${index}`} className={styles.editButton}>Изменить</Link>
                  <button onClick={() => handleDelete(index)} className={styles.deleteButton}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.noUsers}>Пользователи не найдены.</p>
      )}
    </div>
  );
}

export default Users;
