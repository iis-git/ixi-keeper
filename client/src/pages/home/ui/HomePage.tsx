import { FC } from 'react';
import { Link } from 'react-router-dom';

export const HomePage: FC = () => {
  return (
    <div className="home">
      <h1>Добро пожаловать в Ixi-Keeper</h1>
      <p className="description">
        Клиентское приложение для взаимодействия с REST API Ixi-Keeper.
      </p>

      <div className="card-container">
        <div className="card">
          <h2>Пользователи</h2>
          <p>Управление пользователями: создание, просмотр, редактирование и удаление.</p>
          <Link to="/users" className="button">Перейти к пользователям</Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
