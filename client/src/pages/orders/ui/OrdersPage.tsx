import React, { useState, useEffect } from 'react';
import { orderApi, Order } from '../../../shared/api/order';
import styles from './OrdersPage.module.scss';

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchQuery]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderApi.getAll();
      setOrders(response.data);
      setError(null);
    } catch (err) {
      setError('Ошибка при загрузке заказов');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Фильтрация по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Поиск по имени гостя или номеру заказа
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.guestName.toLowerCase().includes(query) ||
        order.id.toString().includes(query)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleStatusChange = async (orderId: number, newStatus: 'completed' | 'cancelled') => {
    try {
      if (newStatus === 'completed') {
        const paymentMethod = prompt('Выберите способ оплаты (cash/card/transfer):') as 'cash' | 'card' | 'transfer';
        if (!paymentMethod || !['cash', 'card', 'transfer'].includes(paymentMethod)) {
          alert('Некорректный способ оплаты');
          return;
        }
        const comment = prompt('Комментарий (необязательно):') || undefined;
        await orderApi.complete(orderId, paymentMethod, comment);
      } else {
        const comment = prompt('Причина отмены:') || undefined;
        await orderApi.cancel(orderId, comment);
      }
      
      await fetchOrders();
    } catch (err) {
      setError('Ошибка при обновлении заказа');
      console.error('Error updating order:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { text: 'Активный', class: 'active' },
      completed: { text: 'Завершен', class: 'completed' },
      cancelled: { text: 'Отменен', class: 'cancelled' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, class: 'default' };
    
    return (
      <span className={`${styles.statusBadge} ${styles[statusInfo.class]}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getPaymentMethodText = (method?: string) => {
    const methodMap = {
      cash: 'Наличные',
      card: 'Карта',
      transfer: 'Перевод'
    };
    return method ? methodMap[method as keyof typeof methodMap] || method : '—';
  };

  if (loading) return <div className={styles.loading}>Загрузка заказов...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.ordersPage}>
      <div className={styles.header}>
        <h1>Все заказы</h1>
        <div className={styles.controls}>
          <div className={styles.filterGroup}>
            <label htmlFor="statusFilter">Статус:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">Все</option>
              <option value="active">Активные</option>
              <option value="completed">Завершенные</option>
              <option value="cancelled">Отмененные</option>
            </select>
          </div>
          
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Поиск по имени или номеру заказа..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.ordersTable}>
          <thead>
            <tr>
              <th>№ заказа</th>
              <th>Имя гостя</th>
              <th>Дата/время</th>
              <th>Статус</th>
              <th>Сумма</th>
              <th>Способ оплаты</th>
              <th>Комментарий</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.noData}>
                  {searchQuery || statusFilter !== 'all' ? 'Заказы не найдены' : 'Заказов пока нет'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.guestName}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{parseFloat(order.totalAmount.toString()).toFixed(2)} ₽</td>
                  <td>{getPaymentMethodText(order.paymentMethod)}</td>
                  <td className={styles.comment}>
                    {order.comment ? (
                      <span title={order.comment}>
                        {order.comment.length > 30 
                          ? `${order.comment.substring(0, 30)}...` 
                          : order.comment
                        }
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {order.status === 'active' && (
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          className={`${styles.actionBtn} ${styles.completeBtn}`}
                          title="Завершить заказ"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          className={`${styles.actionBtn} ${styles.cancelBtn}`}
                          title="Отменить заказ"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.summary}>
        <p>Всего заказов: {filteredOrders.length}</p>
        {statusFilter === 'all' && (
          <p>
            Активных: {orders.filter(o => o.status === 'active').length} | 
            Завершенных: {orders.filter(o => o.status === 'completed').length} | 
            Отмененных: {orders.filter(o => o.status === 'cancelled').length}
          </p>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
