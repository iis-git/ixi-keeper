import React from 'react';
import { Modal } from '../../../../shared/ui';
import type { Product } from '../../../../entities/product/model/types';
import styles from './OrderActionModal.module.scss';

interface OrderActionModalProps {
  product: Product | null;
  open: boolean;
  onCancel: () => void;
  onCreateWithGuest: () => void;
  onAddToActive: () => void;
}

export const OrderActionModal: React.FC<OrderActionModalProps> = ({
  product,
  open,
  onCancel,
  onCreateWithGuest,
  onAddToActive
}) => {
  if (!product) return null;

  return (
    <Modal
      title="Выберите действие"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
      centered
    >
      <div className={styles.actionModal}>
        {/* Информация о товаре */}
        <div className={styles.productInfo}>
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
          </div>
        </div>

        {/* Кнопки действий */}
        <div className={styles.actions}>
          <button 
            className={`${styles.actionButton} ${styles.withGuest}`}
            onClick={onCreateWithGuest}
          >
            <div className={styles.buttonContent}>
              <span className={styles.buttonTitle}>Создать новый заказ</span>
              <span className={styles.buttonDescription}>Новый заказ с указанием имени</span>
            </div>
          </button>

          <button 
            className={`${styles.actionButton} ${styles.addToActive}`}
            onClick={onAddToActive}
          >
            <div className={styles.buttonContent}>
              <span className={styles.buttonTitle}>Добавить к активному</span>
              <span className={styles.buttonDescription}>Выбрать из списка активных заказов</span>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default OrderActionModal;
