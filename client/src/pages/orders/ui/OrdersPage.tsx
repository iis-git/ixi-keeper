import React, { useState, useEffect } from 'react';
import { EyeOutlined } from '@ant-design/icons';
import { orderApi, Order } from '../../../shared/api/order';
import { ViewOrderModal } from '../../../features/orders/view-order';
import styles from './OrdersPage.module.scss';

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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

  // Отображение имени гостя: для авто-сгенерированных имён показываем "no name"
  const getDisplayGuestName = (name?: string): string => {
    if (!name) return 'no name';
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'no name';
    const lower = trimmed.toLowerCase();
    const autoPatterns = [
      /^гость\s*\d+$/,        // Гость 5
      /^стол\s*\d+$/,         // Стол 3
      /^бар\s*\d+$/,          // Бар 1
      /^улиц[аы]\s*\d+$/,     // Улица 2 / Улицы 2
    ];
    if (autoPatterns.some((rx) => rx.test(lower))) return 'no name';
    return trimmed;
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setSelectedOrder(null);
    setIsViewModalOpen(false);
  };

  if (loading) return <div className={styles.loading}>Загрузка заказов...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.ordersPage}>
      <div className={styles.header}>
        <h1>Заказы</h1>
        <div className={styles.controls}>
          <div className={styles.filterGroup}>
            <label>Статус:</label>
            <div className={styles.statusButtons}>
              <button
                className={`${styles.statusBtn} ${statusFilter === 'all' ? styles.active : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Все
              </button>
              <button
                className={`${styles.statusBtn} ${styles.activeBtn} ${statusFilter === 'active' ? styles.active : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Активные
              </button>
              <button
                className={`${styles.statusBtn} ${styles.completedBtn} ${statusFilter === 'completed' ? styles.active : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Завершенные
              </button>
              <button
                className={`${styles.statusBtn} ${styles.cancelledBtn} ${statusFilter === 'cancelled' ? styles.active : ''}`}
                onClick={() => setStatusFilter('cancelled')}
              >
                Отмененные
              </button>
            </div>
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
              <th>Гостей</th>
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
                <td colSpan={9} className={styles.noData}>
                  {searchQuery || statusFilter !== 'all' ? 'Заказы не найдены' : 'Заказов пока нет'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{getDisplayGuestName(order.guestName)}</td>
                  <td>{typeof order.guestsCount === 'number' ? order.guestsCount : '—'}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{parseFloat(order.totalAmount.toString()).toFixed(2)} ₾</td>
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
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionBtn} ${styles.viewBtn}`}
                        onClick={() => handleViewOrder(order)}
                        title="Просмотреть заказ"
                      >
                        <EyeOutlined />
                      </button>
                      {order.status === 'active' && (
                        <>
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
                        </>
                      )}
                    </div>
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

      {/* Модалка просмотра заказа */}
      <ViewOrderModal
        order={selectedOrder}
        open={isViewModalOpen}
        onCancel={handleCloseViewModal}
      />
    </div>
  );
};

export default OrdersPage;
