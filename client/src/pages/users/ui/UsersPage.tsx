import { FC } from 'react';
import { UserTable } from '../../../widgets/user-management/ui/UserTable';

export const UsersPage: FC = () => {
  return (
    <div className="users-page">
      <UserTable />
    </div>
  );
};

export default UsersPage;
