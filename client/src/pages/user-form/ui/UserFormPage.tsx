import { FC } from 'react';
import { useParams } from 'react-router-dom';
import { UserForm } from '../../../features/user/edit/ui/UserForm';

export const UserFormPage: FC = () => {
  const { id } = useParams<Record<string, string | undefined>>();
  const userId = id ? parseInt(id) : undefined;
  
  return (
    <div className="user-form-container">
      <h1>{userId !== undefined ? 'Редактирование пользователя' : 'Добавление нового пользователя'}</h1>
      <UserForm userId={userId} />
    </div>
  );
};

export default UserFormPage;
