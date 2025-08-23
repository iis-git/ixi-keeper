import { FC, ReactNode } from 'react';
import { userApi } from '../../../../shared/api/user';
import { handleApiError } from '../../../../shared/api/base';

interface DeleteUserButtonProps {
  userId: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  className?: string;
  icon?: ReactNode;
}

export const DeleteUserButton: FC<DeleteUserButtonProps> = ({ userId, onSuccess, onError, className, icon }) => {
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
    <button onClick={handleDelete} className={className || "delete-button"} title="Удалить пользователя">
      {icon || 'Удалить'}
    </button>
  );
};
