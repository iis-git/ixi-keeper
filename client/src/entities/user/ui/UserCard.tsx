import { FC } from 'react';
import { User } from '../model/types';

interface UserCardProps {
  user: User;
}

export const UserCard: FC<UserCardProps> = ({ user }) => {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>Телефон: {user.phone}</p>
      <p>Сумма заказов: {user.totalOrdersAmount}</p>
      <p>Количество посещений: {user.visitCount}</p>
      <p>Средний чек: {user.averageCheck}</p>
    </div>
  );
};
