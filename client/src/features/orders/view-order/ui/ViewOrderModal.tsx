import React from 'react';
import { Modal } from 'antd';
import type { Order } from '../../../../shared/api/order';
import styles from './ViewOrderModal.module.scss';

interface ViewOrderModalProps {
  order: Order | null;
  open: boolean;
  onCancel: () => void;
}

export const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  order,
  open,
  onCancel
}) => {
  if (!order) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      active: 'Активный',
      completed: 'Завершен',
      cancelled: 'Отменен'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getPaymentMethodText = (method?: string) => {
    const methodMap = {
      cash: 'Наличные',
      card: 'Карта',
      transfer: 'Перевод'
    };
    return method ? methodMap[method as keyof typeof methodMap] || method : '—';
  };

  return (
    <Modal
      title={`Заказ #${order.id}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
      centered
    >
      <div className={styles.orderDetails}>
        {/* Основная информация */}
        <div className={styles.section}>
          <h3>Основная информация</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Имя гостя:</span>
              <span className={styles.value}>{order.guestName || '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Дата создания:</span>
              <span className={styles.value}>{formatDate(order.createdAt)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Статус:</span>
              <span className={`${styles.value} ${styles.status} ${styles[order.status]}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Общая сумма:</span>
              <span className={styles.value}>{parseFloat(order.totalAmount.toString()).toFixed(2)} ₽</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Способ оплаты:</span>
              <span className={styles.value}>{getPaymentMethodText(order.paymentMethod)}</span>
            </div>
            {order.closedAt && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Дата закрытия:</span>
                <span className={styles.value}>{formatDate(order.closedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Состав заказа */}
        <div className={styles.section}>
          <h3>Состав заказа</h3>
          <div className={styles.orderItems}>
            {order.orderItems && order.orderItems.length > 0 ? (
              <div className={styles.itemsList}>
                {order.orderItems.map((item, index) => (
                  <div key={index} className={styles.orderItem}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.productName}</span>
                      <span className={styles.itemQuantity}>× {item.quantity}</span>
                    </div>
                    <div className={styles.itemPrices}>
                      <span className={styles.itemPrice}>{item.price} ₽</span>
                      <span className={styles.itemTotal}>
                        {(parseFloat(item.price.toString()) * item.quantity).toFixed(2)} ₽
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noItems}>Состав заказа не указан</p>
            )}
          </div>
        </div>

        {/* Комментарий */}
        {order.comment && (
          <div className={styles.section}>
            <h3>Комментарий</h3>
            <div className={styles.comment}>
              {order.comment}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViewOrderModal;
