import React, { useEffect, useState } from 'react';
import { Input } from 'antd';
import { shiftApi } from '../../../../shared/api/shifts';
import styles from './PaymentModal.module.scss';

const { TextArea } = Input;

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPayment: (paymentMethod: 'cash' | 'card' | 'transfer', comment?: string, closedByUserId?: number) => void;
  orderTotal: number | string;
  guestName: string;
  bartenders?: { id: number; name: string }[];
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onPayment,
  orderTotal,
  guestName,
  bartenders: bartendersProp
}) => {
  const [comment, setComment] = useState('');
  const [bartenders, setBartenders] = useState<{ id: number; name: string }[]>([]);
  const [selectedBartenderId, setSelectedBartenderId] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Если переданы бармены пропсом — используем их. Иначе пробуем загрузить активную смену.
    const applyList = (list: { id: number; name: string }[]) => {
      setBartenders(list);
      if (list.length === 1) setSelectedBartenderId(list[0].id);
    };
    if (bartendersProp && Array.isArray(bartendersProp)) {
      applyList(bartendersProp);
    } else if (visible) {
      const loadActive = async () => {
        try {
          const resp = await shiftApi.getActive();
          const data: any = resp.data;
          const list = data && data.bartenders ? data.bartenders.map((b: any) => ({ id: b.user?.id ?? b.userId, name: b.user?.name ?? `#${b.userId}` })) : [];
          applyList(list);
        } catch (e) {
          applyList([]);
        }
      };
      loadActive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, bartendersProp]);

  if (!visible) return null;

  const handlePayment = (paymentMethod: 'cash' | 'card' | 'transfer') => {
    if (bartenders.length > 1 && !selectedBartenderId) {
      alert('Выберите, кто закрывает заказ');
      return;
    }
    onPayment(paymentMethod, comment || undefined, selectedBartenderId);
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

          {bartenders.length > 0 && (
            <div style={{ margin: '8px 0' }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Кто закрывает заказ:</label>
              <select
                value={selectedBartenderId ?? ''}
                onChange={(e) => setSelectedBartenderId(e.target.value ? Number(e.target.value) : undefined)}
                className={styles.select}
              >
                <option value="">— выбрать —</option>
                {bartenders.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {bartenders.length > 1 && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  Обязательно выберите бармена, если их несколько в смене
                </div>
              )}
            </div>
          )}

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
