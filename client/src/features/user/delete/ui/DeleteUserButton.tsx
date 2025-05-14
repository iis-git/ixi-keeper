import { FC } from 'react';
import { userApi } from '../../../../shared/api/user';
import { handleApiError } from '../../../../shared/api/base';

interface DeleteUserButtonProps {
  userId: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const DeleteUserButton: FC<DeleteUserButtonProps> = ({ userId, onSuccess, onError }) => {
  const handleDelete = async () => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        await userApi.delete(userId);
        onSuccess();
      } catch (err: any) {
        const errorMessage = handleApiError(err);
        onError(`Не удалось удалить пользователя. ${errorMessage}`);
      }
    }
  };

  return (
    <button onClick={handleDelete} className="delete-button">
      Удалить
    </button>
  );
};
