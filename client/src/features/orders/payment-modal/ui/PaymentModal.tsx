import React, { useState } from 'react';
import { Input } from 'antd';
import styles from './PaymentModal.module.scss';

const { TextArea } = Input;

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPayment: (paymentMethod: 'cash' | 'card' | 'transfer', comment?: string) => void;
  orderTotal: number | string;
  guestName: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onPayment,
  orderTotal,
  guestName
}) => {
  const [comment, setComment] = useState('');

  if (!visible) return null;

  const handlePayment = (paymentMethod: 'cash' | 'card' | 'transfer') => {
    onPayment(paymentMethod, comment || undefined);
    setComment('');
    onClose();
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Оплата заказа</h3>
          <button className={styles.closeBtn} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.orderInfo}>
            <div className={styles.guestName}>Гость: {guestName}</div>
            <div className={styles.totalAmount}>
              Сумма к оплате: <strong>{parseFloat(orderTotal.toString()).toFixed(2)} ₾</strong>
            </div>
          </div>

          <div className={styles.commentSection}>
            <label htmlFor="payment-comment">Комментарий (необязательно):</label>
            <TextArea
              id="payment-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Введите комментарий..."
              rows={3}
              className={styles.commentInput}
            />
          </div>

          <div className={styles.paymentMethods}>
            <h4>Выберите способ оплаты:</h4>
            <div className={styles.methodButtons}>
              <button
                className={`${styles.methodBtn} ${styles.cashBtn}`}
                onClick={() => handlePayment('cash')}
              >
                💵 Наличные
              </button>
              <button
                className={`${styles.methodBtn} ${styles.cardBtn}`}
                onClick={() => handlePayment('card')}
              >
                💳 Карта
              </button>
              <button
                className={`${styles.methodBtn} ${styles.transferBtn}`}
                onClick={() => handlePayment('transfer')}
              >
                📱 Перевод
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
