import { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../../../entities/user/model/types';
import { userApi } from '../../../../shared/api/user';
import { handleApiError } from '../../../../shared/api/base';

export const UserList: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await userApi.getAll();
      setUsers(response.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить пользователей. ${errorMessage}`);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="users-list">
      {users.length > 0 ? (
        <table className="users-table">
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
                <td className="actions">
                  <Link to={`/users/edit/${index}`} className="edit-button">Изменить</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-users">Пользователи не найдены.</p>
      )}
    </div>
  );
};
