import React, { useState, useEffect } from 'react';
import { EditOutlined, CloseOutlined } from '@ant-design/icons';
import { orderApi, Order } from '../../../../shared/api/order';
import { EditOrderModal } from '../../edit-order';
import { PaymentModal } from '../../payment-modal';
import { shiftApi } from '../../../../shared/api/shifts';
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
  const [flashHighlight, setFlashHighlight] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [orderToPayId, setOrderToPayId] = useState<number | null>(null);
  const [paymentBartenders, setPaymentBartenders] = useState<{ id: number; name: string }[]>([]);

  const handleSetDiscount = async (orderId: number) => {
    const input = prompt('Введите скидку для заказа, % (0-100):', '10');
    if (input === null) return;
    const p = Number(input);
    if (isNaN(p) || p < 0 || p > 100) {
      alert('Некорректное значение скидки. Допустимо 0..100');
      return;
    }
    try {
      await orderApi.setDiscount(orderId, p);
      await fetchActiveOrders();
    } catch (err) {
      setError('Не удалось применить скидку');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Слушаем событие для подсветки активных заказов
  useEffect(() => {
    const handler = () => {
      setFlashHighlight(true);
      // снимаем подсветку через 3000мс (совпадает с длительностью CSS-анимации)
      const t = setTimeout(() => setFlashHighlight(false), 3000);
      return () => clearTimeout(t);
    };
    window.addEventListener('flash-active-orders' as any, handler);
    return () => {
      window.removeEventListener('flash-active-orders' as any, handler);
    };
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
    setOrderToPayId(orderId);
    // Покажем модалку сразу, а список барменов дотащим в фоне
    setPaymentModalVisible(true);
    try {
      const resp = await shiftApi.getActive();
      const data: any = resp.data;
      const list = data && data.bartenders ? data.bartenders.map((b: any) => ({ id: b.user?.id ?? b.userId, name: b.user?.name ?? `#${b.userId}` })) : [];
      setPaymentBartenders(list);
    } catch (e) {
      setPaymentBartenders([]);
    }
  };

  const handlePaymentConfirm = async (paymentMethod: 'cash' | 'card' | 'transfer', comment?: string, closedByUserId?: number) => {
    if (!orderToPayId) return;

    try {
      await orderApi.complete(orderToPayId, paymentMethod, comment, closedByUserId);
      await fetchActiveOrders();
      // Убираем заказ из развернутых
      const newExpanded = new Set(expandedOrders);
      newExpanded.delete(orderToPayId);
      setExpandedOrders(newExpanded);
    } catch (err) {
      setError('Ошибка при оплате заказа');
      console.error('Error completing order:', err);
    }
  };

  const handlePaymentModalClose = () => {
    setPaymentModalVisible(false);
    setOrderToPayId(null);
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
    <div className={`${styles.activeOrders} ${flashHighlight ? styles.flash : ''}`}>
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
                      <span className={styles.guestsCount} title="Гостей">
                        {/* Small black guest icon */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path fill="currentColor" d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 2.239-7 5v1h14v-1c0-2.761-3.134-5-7-5z"/>
                        </svg>
                        <span className={styles.guestsCountNumber}>{order.guestsCount || 1}</span>
                      </span>
                      <span className={styles.itemsCount}>
                        {order.orderItems.length} поз.
                      </span>
                    </div>
                  </div>
                  <div className={styles.totalAmount}>
                    {Number(order.discountAmount || 0) > 0 ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ textDecoration: 'line-through', color: '#999' }}>
                          {parseFloat(order.totalAmount.toString()).toFixed(2)} ₾
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {Number(order.netAmount ?? order.totalAmount).toFixed(2)} ₾
                        </div>
                      </div>
                    ) : (
                      <span>{parseFloat(order.totalAmount.toString()).toFixed(2)} ₾</span>
                    )}
                  </div>
                  <div className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                    ▼
                  </div>
                </div>

                <div className={`${styles.orderDetails} ${isExpanded ? styles.open : ''}`}>
                  <div className={styles.orderItems}>
                    {order.orderItems.map((item, index) => (
                      <div key={index} className={styles.orderItem}>
                        <span className={styles.itemName}>{item.productName}</span>
                        <span className={styles.itemQuantity}>×{item.quantity}</span>
                        <span className={styles.itemPrice}>{(parseFloat(item.price.toString()) * item.quantity).toFixed(2)} ₾</span>
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
                    {Number(order.discountAmount || 0) > 0 ? (
                      <div>
                        <div style={{ textDecoration: 'line-through', color: '#999' }}>
                          Итого: {parseFloat(order.totalAmount.toString()).toFixed(2)} ₾
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          К оплате: {Number(order.netAmount ?? order.totalAmount).toFixed(2)} ₾
                        </div>
                        <div style={{ color: '#cf1322', fontSize: 12 }}>
                          Скидка: −{Number(order.discountAmount).toFixed(2)} ₾ ({Number(order.discountPercent || 0).toFixed(1)}%)
                        </div>
                      </div>
                    ) : (
                      <strong>Итого: {parseFloat(order.totalAmount.toString()).toFixed(2)} ₾</strong>
                    )}
                  </div>

                  <div className={styles.orderActions}>
                    <button
                      onClick={() => handleEditOrder(order)}
                      className={`${styles.actionBtn} ${styles.editBtn}`}
                      title="Редактировать заказ"
                    >
                      <EditOutlined />
                    </button>
                    <button
                      onClick={() => handleSetDiscount(order.id)}
                      className={styles.actionBtn}
                      title="Установить скидку"
                    >
                      %
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
                      title="Закрыть заказ"
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                </div>
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
      
      <PaymentModal
        visible={paymentModalVisible}
        onClose={handlePaymentModalClose}
        onPayment={handlePaymentConfirm}
        orderTotal={(
          () => {
            const ord = orderToPayId ? activeOrders.find(o => o.id === orderToPayId) : undefined;
            if (!ord) return 0;
            const val = (ord.netAmount ?? ord.totalAmount ?? 0) as any;
            const num = Number(val);
            return isNaN(num) ? 0 : num;
          }
        )()}
        guestName={(
          () => {
            const ord = orderToPayId ? activeOrders.find(o => o.id === orderToPayId) : undefined;
            return ord?.guestName || '';
          }
        )()}
        bartenders={paymentBartenders}
      />
    </div>
  );
};

export default ActiveOrders;
