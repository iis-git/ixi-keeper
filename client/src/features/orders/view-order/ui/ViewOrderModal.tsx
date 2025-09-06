import React, { useEffect, useState } from 'react';
import { Modal, Divider, Select, InputNumber, Input, Button, List, Tag, message } from 'antd';
import type { Order, WriteOff } from '../../../../shared/api/order';
import { orderApi } from '../../../../shared/api/order';
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

  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  const [woLoading, setWoLoading] = useState(false);
  const [woProductId, setWoProductId] = useState<number | undefined>(undefined);
  const [woQty, setWoQty] = useState<number>(1);
  const [woReason, setWoReason] = useState<string>('');

  const loadWriteOffs = async () => {
    if (!order) return;
    try {
      setWoLoading(true);
      const { data } = await orderApi.getWriteOffs(order.id);
      setWriteOffs(data);
    } catch (e) {
      message.error('Не удалось загрузить списания');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setWoLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadWriteOffs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

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
              <span className={styles.value}>{parseFloat(order.totalAmount.toString()).toFixed(2)} ₾</span>
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
                      <span className={styles.itemPrice}>{item.price} ₾</span>
                      <span className={styles.itemTotal}>
                        {(parseFloat(item.price.toString()) * item.quantity).toFixed(2)} ₾
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

        {/* Списания */}
        <div className={styles.section}>
          <h3>Списания</h3>
          {order.status === 'active' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <Select
                style={{ minWidth: 220 }}
                placeholder="Товар из заказа"
                value={woProductId}
                onChange={(v) => setWoProductId(v)}
                showSearch
                optionFilterProp="label"
              >
                {order.orderItems.map((it, idx) => (
                  <Select.Option key={`${it.productId}-${idx}`} value={it.productId} label={it.productName}>
                    {it.productName}
                  </Select.Option>
                ))}
              </Select>
              <InputNumber
                min={0.1}
                step={0.1}
                value={woQty}
                onChange={(v) => setWoQty(Number(v) || 0)}
                style={{ width: 120 }}
              />
              <Input
                placeholder="Причина (необязательно)"
                value={woReason}
                onChange={(e) => setWoReason(e.target.value)}
                style={{ minWidth: 220 }}
                maxLength={120}
              />
              <Button
                type="primary"
                onClick={async () => {
                  if (!woProductId || !woQty || woQty <= 0) {
                    message.warning('Выберите товар и укажите количество > 0');
                    return;
                  }
                  try {
                    setWoLoading(true);
                    await orderApi.createWriteOff(order.id, { productId: woProductId, quantity: woQty, reason: woReason || undefined });
                    message.success('Списание добавлено');
                    setWoReason('');
                    setWoQty(1);
                    setWoProductId(undefined);
                    await loadWriteOffs();
                  } catch (e) {
                    message.error('Не удалось создать списание');
                    // eslint-disable-next-line no-console
                    console.error(e);
                  } finally {
                    setWoLoading(false);
                  }
                }}
                loading={woLoading}
              >
                Списать
              </Button>
            </div>
          )}
          <List
            bordered
            size="small"
            dataSource={writeOffs}
            locale={{ emptyText: 'Списаний нет' }}
            renderItem={(wo) => (
              <List.Item>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div>
                    <strong>{wo.product?.name || `#${wo.productId}`}</strong>{' '}
                    <Tag color="volcano">−{parseFloat(wo.quantity.toString())}</Tag>
                    <span style={{ color: '#999' }}>{new Date(wo.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  <div style={{ color: '#666' }}>{wo.reason || '—'}</div>
                </div>
              </List.Item>
            )}
          />
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
