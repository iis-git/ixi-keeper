import React, { useState, useEffect } from 'react';
import { orderApi, Order } from '../../../../shared/api/order';
import { EditOrderModal } from '../../edit-order';
import styles from './ActiveOrders.module.scss';

interface ActiveOrdersProps {
  onOrderToggle?: (orderId: number | null) => void;
  openOrderId?: number | null;
  refreshTrigger?: number;
}

const ActiveOrders: React.FC<ActiveOrdersProps> = ({ onOrderToggle, openOrderId, refreshTrigger }) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchActiveOrders();
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Обновляем при изменении refreshTrigger
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchActiveOrders();
    }
  }, [refreshTrigger]);

  const fetchActiveOrders = async () => {
    try {
      const response = await orderApi.getActive();
      setActiveOrders(response.data);
      
      // Проверяем, есть ли открытый заказ среди активных
      if (openOrderId && !response.data.find(order => order.id === openOrderId)) {
        console.log('Открытый заказ больше не активен, сбрасываем openOrderId');
        onOrderToggle?.(null);
        setExpandedOrders(new Set());
      }
      
      setError(null);
    } catch (err) {
      setError('Ошибка при загрузке активных заказов');
      console.error('Error fetching active orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpansion = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
      onOrderToggle?.(null); // Заказ закрыт
    } else {
      newExpanded.clear(); // Закрываем все другие заказы
      newExpanded.add(orderId);
      onOrderToggle?.(orderId); // Заказ открыт
    }
    setExpandedOrders(newExpanded);
  };

  const handlePayOrder = async (orderId: number) => {
    const paymentMethod = prompt('Выберите способ оплаты:\ncash - Наличные\ncard - Карта\ntransfer - Перевод') as 'cash' | 'card' | 'transfer';
    
    if (!paymentMethod || !['cash', 'card', 'transfer'].includes(paymentMethod)) {
      alert('Некорректный способ оплаты');
      return;
    }

    const comment = prompt('Комментарий (необязательно):') || undefined;

    try {
      await orderApi.complete(orderId, paymentMethod, comment);
      await fetchActiveOrders();
      // Убираем заказ из развернутых
      const newExpanded = new Set(expandedOrders);
      newExpanded.delete(orderId);
      setExpandedOrders(newExpanded);
    } catch (err) {
      setError('Ошибка при оплате заказа');
      console.error('Error completing order:', err);
    }
  };

  const handleCloseOrder = async (orderId: number) => {
    const comment = prompt('Причина закрытия заказа:');
    if (!comment) return;

    try {
      await orderApi.cancel(orderId, comment);
      await fetchActiveOrders();
      // Убираем заказ из развернутых
      const newExpanded = new Set(expandedOrders);
      newExpanded.delete(orderId);
      setExpandedOrders(newExpanded);
    } catch (err) {
      setError('Ошибка при закрытии заказа');
      console.error('Error cancelling order:', err);
    }
  };

  const handleRemoveItem = async (orderId: number, itemIndex: number, itemName: string) => {
    const confirmed = confirm(`Удалить "${itemName}" из заказа?`);
    if (!confirmed) return;

    try {
      await orderApi.removeItem(orderId, itemIndex);
      await fetchActiveOrders();
    } catch (err) {
      setError('Ошибка при удалении позиции');
      console.error('Error removing item:', err);
    }
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setSelectedOrder(null);
  };

  const handleOrderUpdated = () => {
    fetchActiveOrders();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (loading) {
    return (
      <div className={styles.activeOrders}>
        <h3>Активные заказы</h3>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.activeOrders}>
        <h3>Активные заказы</h3>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.activeOrders}>
      <div className={styles.header}>
        <h3>Активные заказы</h3>
        <span className={styles.counter}>{activeOrders.length}</span>
      </div>

      {activeOrders.length === 0 ? (
        <div className={styles.noOrders}>
          <p>Нет активных заказов</p>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {activeOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div key={order.id} className={styles.orderCard}>
                <div 
                  className={styles.orderHeader}
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <div className={styles.orderInfo}>
                    <div className={styles.guestName}>{order.guestName}</div>
                    <div className={styles.orderMeta}>
                      <span className={styles.time}>{formatTime(order.createdAt)}</span>
                      <span className={styles.itemsCount}>
                        {order.orderItems.length} поз.
                      </span>
                    </div>
                  </div>
                  <div className={styles.totalAmount}>
                    {parseFloat(order.totalAmount.toString()).toFixed(2)} ₽
                  </div>
                  <div className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                    ▼
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.orderDetails}>
                    <div className={styles.orderItems}>
                      {order.orderItems.map((item, index) => (
                        <div key={index} className={styles.orderItem}>
                          <span className={styles.itemName}>{item.productName}</span>
                          <span className={styles.itemQuantity}>×{item.quantity}</span>
                          <span className={styles.itemPrice}>{(parseFloat(item.price.toString()) * item.quantity).toFixed(2)} ₽</span>
                          <button
                            onClick={() => handleRemoveItem(order.id, index, item.productName)}
                            className={styles.removeItemBtn}
                            title="Удалить позицию"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className={styles.orderTotal}>
                      <strong>Итого: {parseFloat(order.totalAmount.toString()).toFixed(2)} ₽</strong>
                    </div>

                    <div className={styles.orderActions}>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handlePayOrder(order.id)}
                        className={`${styles.actionBtn} ${styles.payBtn}`}
                      >
                        Оплатить
                      </button>
                      <button
                        onClick={() => handleCloseOrder(order.id)}
                        className={`${styles.actionBtn} ${styles.closeBtn}`}
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <EditOrderModal
        visible={editModalVisible}
        order={selectedOrder}
        onClose={handleCloseEditModal}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  );
};

export default ActiveOrders;
