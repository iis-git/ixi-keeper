import { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input, Select, InputNumber, Button } from 'antd';
import { EditOutlined, DeleteOutlined, SearchOutlined, FilterOutlined, CaretUpOutlined, CaretDownOutlined, BarChartOutlined } from '@ant-design/icons';
import { DeleteUserButton } from '../../../features/user/delete/ui/DeleteUserButton';
import { UserProductStatsModal } from '../../../features/user/product-stats';
import { userApi } from '../../../shared/api/user';
import { handleApiError } from '../../../shared/api/base';
import { User } from '../../../entities/user/model/types';
import styles from './UserTable.module.scss';

export const UserTable: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debtorFilter, setDebtorFilter] = useState<string>('all');
  const [averageCheckMin, setAverageCheckMin] = useState<number | null>(null);
  const [averageCheckMax, setAverageCheckMax] = useState<number | null>(null);
  const [totalOrdersMin, setTotalOrdersMin] = useState<number | null>(null);
  const [totalOrdersMax, setTotalOrdersMax] = useState<number | null>(null);
  const [visitCountMin, setVisitCountMin] = useState<number | null>(null);
  const [visitCountMax, setVisitCountMax] = useState<number | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await userApi.getAll();
      setUsers(response.data);
      setFilteredUsers(response.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(`Не удалось загрузить пользователей. ${errorMessage}`);
      setLoading(false);
    }
  };

  // Фильтрация пользователей
  useEffect(() => {
    let filtered = users;

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery))
      );
    }

    // Фильтр по должникам
    if (debtorFilter === 'debtors') {
      filtered = filtered.filter(user => user.isDebtor);
    } else if (debtorFilter === 'non-debtors') {
      filtered = filtered.filter(user => !user.isDebtor);
    }

    // Фильтр по среднему чеку
    if (averageCheckMin !== null) {
      filtered = filtered.filter(user => (user.averageCheck || 0) >= averageCheckMin);
    }
    if (averageCheckMax !== null) {
      filtered = filtered.filter(user => (user.averageCheck || 0) <= averageCheckMax);
    }

    // Фильтр по сумме заказов
    if (totalOrdersMin !== null) {
      filtered = filtered.filter(user => (user.totalOrdersAmount || 0) >= totalOrdersMin);
    }
    if (totalOrdersMax !== null) {
      filtered = filtered.filter(user => (user.totalOrdersAmount || 0) <= totalOrdersMax);
    }

    // Фильтр по количеству посещений
    if (visitCountMin !== null) {
      filtered = filtered.filter(user => (user.visitCount || 0) >= visitCountMin);
    }
    if (visitCountMax !== null) {
      filtered = filtered.filter(user => (user.visitCount || 0) <= visitCountMax);
    }

    // Сортировка
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'averageCheck':
            aValue = a.averageCheck || 0;
            bValue = b.averageCheck || 0;
            break;
          case 'totalOrdersAmount':
            aValue = a.totalOrdersAmount || 0;
            bValue = b.totalOrdersAmount || 0;
            break;
          case 'visitCount':
            aValue = a.visitCount || 0;
            bValue = b.visitCount || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, debtorFilter, averageCheckMin, averageCheckMax, totalOrdersMin, totalOrdersMax, visitCountMin, visitCountMax, sortField, sortDirection]);

  const handleDeleteSuccess = () => {
    fetchUsers();
  };

  const handleDeleteError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDebtorFilter('all');
    setAverageCheckMin(null);
    setAverageCheckMax(null);
    setTotalOrdersMin(null);
    setTotalOrdersMax(null);
    setVisitCountMin(null);
    setVisitCountMax(null);
    setSortField(null);
    setSortDirection('asc');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Если уже сортируем по этому полю, меняем направление
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Если новое поле, устанавливаем по возрастанию
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return null;
    }
    return sortDirection === 'asc' ? <CaretUpOutlined /> : <CaretDownOutlined />;
  };

  const handleShowStats = (user: User) => {
    console.log('Opening stats for user:', user);
    setSelectedUser(user);
    setStatsModalVisible(true);
  };

  const handleCloseStats = () => {
    setStatsModalVisible(false);
    setSelectedUser(null);
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

      {/* Фильтры и поиск */}
      <div className={styles.filtersSection}>
        <div className={styles.filters}>
          <Input
            placeholder="Поиск по имени или телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
            className={styles.searchInput}
          />
          <Select
            value={debtorFilter}
            onChange={setDebtorFilter}
            className={styles.debtorFilter}
          >
            <Select.Option value="all">Все пользователи</Select.Option>
            <Select.Option value="debtors">Только должники</Select.Option>
            <Select.Option value="non-debtors">Без долгов</Select.Option>
          </Select>
          <Button
            type="default"
            icon={<FilterOutlined />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={styles.advancedFiltersBtn}
          >
            Расширенные фильтры
          </Button>
          <Button
            type="default"
            onClick={clearAllFilters}
            className={styles.clearFiltersBtn}
          >
            Очистить
          </Button>
        </div>

        {showAdvancedFilters && (
          <div className={styles.advancedFilters}>
            <div className={styles.filterGroup}>
              <label>Средний чек (₾)</label>
              <div className={styles.rangeInputs}>
                <InputNumber
                  placeholder="От"
                  value={averageCheckMin}
                  onChange={setAverageCheckMin}
                  min={0}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeSeparator}>—</span>
                <InputNumber
                  placeholder="До"
                  value={averageCheckMax}
                  onChange={setAverageCheckMax}
                  min={0}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label>Сумма заказов (₾)</label>
              <div className={styles.rangeInputs}>
                <InputNumber
                  placeholder="От"
                  value={totalOrdersMin}
                  onChange={setTotalOrdersMin}
                  min={0}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeSeparator}>—</span>
                <InputNumber
                  placeholder="До"
                  value={totalOrdersMax}
                  onChange={setTotalOrdersMax}
                  min={0}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label>Количество посещений</label>
              <div className={styles.rangeInputs}>
                <InputNumber
                  placeholder="От"
                  value={visitCountMin}
                  onChange={setVisitCountMin}
                  min={0}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeSeparator}>—</span>
                <InputNumber
                  placeholder="До"
                  value={visitCountMax}
                  onChange={setVisitCountMax}
                  min={0}
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredUsers.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th className={styles.sortableHeader} onClick={() => handleSort('id')}>
                  ID {getSortIcon('id')}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort('name')}>
                  Имя {getSortIcon('name')}
                </th>
                <th>Телефон</th>
                <th>Тип гостя</th>
                <th>Должник</th>
                <th className={styles.sortableHeader} onClick={() => handleSort('totalOrdersAmount')}>
                  Сумма заказов {getSortIcon('totalOrdersAmount')}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort('visitCount')}>
                  Количество посещений {getSortIcon('visitCount')}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort('averageCheck')}>
                  Средний чек {getSortIcon('averageCheck')}
                </th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td className={user.isDebtor ? styles.debtorName : ''}>
                    {user.name}
                    {user.isDebtor && <span className={styles.debtorBadge}>💸</span>}
                  </td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    {user.guestType === 'owner' ? 'Владелец' :
                     user.guestType === 'regular' ? 'Постоянник' :
                     user.guestType === 'bartender' ? 'Бармен' :
                     'Гость'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${user.isDebtor ? styles.debtor : styles.nonDebtor}`}>
                      {user.isDebtor ? 'Да' : 'Нет'}
                    </span>
                  </td>
                  <td>{user.totalOrdersAmount ? `${user.totalOrdersAmount} ₾` : '—'}</td>
                  <td>{user.visitCount || 0}</td>
                  <td>{user.averageCheck ? `${Math.round(user.averageCheck)} ₾` : '—'}</td>
                  <td className={styles.actions}>
                    <Button
                      type="text"
                      size="small"
                      icon={<BarChartOutlined />}
                      onClick={() => handleShowStats(user)}
                      className={`${styles.actionBtn} ${styles.statsBtn}`}
                      title="Статистика заказов"
                    />
                    <Link to={`/users/edit/${user.id}`} className={`${styles.actionBtn} ${styles.editBtn}`} title="Редактировать">
                      <EditOutlined />
                    </Link>
                    <DeleteUserButton 
                      userId={user.id} 
                      onSuccess={handleDeleteSuccess} 
                      onError={handleDeleteError}
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      icon={<DeleteOutlined />}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.noUsers}>Пользователи не найдены.</p>
      )}
      
      <div className={styles.summary}>
        <p>Всего пользователей: {filteredUsers.length}</p>
        {debtorFilter === 'all' && (
          <p>
            Должников: {users.filter(u => u.isDebtor).length} | 
            Без долгов: {users.filter(u => !u.isDebtor).length}
          </p>
        )}
      </div>

      {/* Модальное окно статистики */}
      {selectedUser && (
        <UserProductStatsModal
          userId={selectedUser.id}
          userName={selectedUser.name}
          visible={statsModalVisible}
          onClose={handleCloseStats}
        />
      )}
    </div>
  );
};
