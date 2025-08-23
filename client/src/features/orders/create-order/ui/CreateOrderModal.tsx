import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui';
import type { Product } from '../../../../entities/product/model/types';
import styles from './CreateOrderModal.module.scss';

interface CreateOrderModalProps {
  product: Product | null;
  open: boolean;
  onCancel: () => void;
  onCreateOrder: (orderData: OrderData) => void;
}

interface OrderData {
  product: Product;
  quantity: number;
  guestName: string;
  comment?: string;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  product,
  open,
  onCancel,
  onCreateOrder
}) => {
  const [quantity, setQuantity] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!product || !guestName.trim()) return;

    onCreateOrder({
      product,
      quantity,
      guestName: guestName.trim(),
      comment: comment.trim() || undefined
    });

    // Сброс формы
    setQuantity(1);
    setGuestName('');
    setComment('');
  };

  const handleCancel = () => {
    // Сброс формы при отмене
    setQuantity(1);
    setGuestName('');
    setComment('');
    onCancel();
  };

  if (!product) return null;

  const totalPrice = parseFloat(product.price.toString()) * quantity;
  const availableQuantity = product.isComposite 
    ? product.availablePortions || 0 
    : parseFloat(product.stock?.toString() || '0');

  return (
    <Modal
      title="Создать заказ"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="Создать заказ"
      cancelText="Отмена"
      width={600}
      okButtonProps={{
        disabled: !guestName.trim() || quantity <= 0 || quantity > availableQuantity
      }}
    >
      <div className={styles.orderForm}>
        {/* Информация о товаре */}
        <div className={styles.productInfo}>
          <h3>Товар</h3>
          <div className={styles.productCard}>
            <div className={styles.productDetails}>
              <span className={styles.productName}>{product.name}</span>
              <span className={styles.productPrice}>{product.price} ₽</span>
              {product.category && (
                <span 
                  className={styles.categoryBadge}
                  style={{ backgroundColor: product.category.color }}
                >
                  {product.category.name}
                </span>
              )}
              {product.isComposite && (
                <span className={styles.compositeLabel}>
                  Коктейль
                </span>
              )}
            </div>
            <div className={styles.availability}>
              {product.isComposite ? (
                <span>Доступно порций: {availableQuantity}</span>
              ) : (
                <span>В наличии: {availableQuantity} {product.unit || 'шт'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Форма заказа */}
        <div className={styles.formFields}>
          <div className={styles.field}>
            <label htmlFor="guestName">Имя гостя *</label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Введите имя гостя"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="quantity">Количество *</label>
            <div className={styles.quantityControl}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className={styles.quantityBtn}
              >
                -
              </button>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={availableQuantity}
                className={styles.quantityInput}
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
                disabled={quantity >= availableQuantity}
                className={styles.quantityBtn}
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="comment">Комментарий</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительные пожелания..."
              className={styles.textarea}
              rows={3}
            />
          </div>
        </div>

        {/* Итого */}
        <div className={styles.total}>
          <div className={styles.totalRow}>
            <span>Итого:</span>
            <span className={styles.totalPrice}>{totalPrice.toFixed(2)} ₽</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOrderModal;
