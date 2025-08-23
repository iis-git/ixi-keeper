import React, { useState } from 'react';
import { ProductGrid } from '../../display';
import { CreateOrderModal } from '../../../orders/create-order';
import { OrderActionModal } from '../../../orders/action-selector';
import { orderApi } from '../../../../shared/api/order';
import type { Product } from '../../../../entities/product/model/types';
import styles from './ProductSelector.module.scss';

interface ProductSelectorProps {
  onProductSelect?: (product: Product) => void;
  openOrderId?: number | null;
  onOrderUpdate?: () => void;
  className?: string;
  showHeader?: boolean;
  headerTitle?: string;
  showManageButton?: boolean;
  manageButtonText?: string;
  manageButtonLink?: string;
  refreshTrigger?: number;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  onProductSelect,
  openOrderId,
  onOrderUpdate,
  className,
  showHeader = true,
  headerTitle = 'Выбор товаров',
  showManageButton = true,
  manageButtonText = 'Управление товарами',
  manageButtonLink = '/products',
  refreshTrigger
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleProductClick = async (product: Product) => {
    setSelectedProduct(product);
    
    // Если есть открытый заказ - добавляем товар к нему
    if (openOrderId) {
      setIsLoading(true);
      try {
        await orderApi.addItem(openOrderId, product.id, 1);
        console.log(`Товар ${product.name} добавлен к заказу ${openOrderId}`);
        
        // Вызываем callback для обновления заказов
        if (onOrderUpdate) {
          onOrderUpdate();
        }
      } catch (error: any) {
        console.error('Ошибка при добавлении товара к заказу:', error);
        alert(error.response?.data?.message || 'Ошибка при добавлении товара к заказу');
      } finally {
        setIsLoading(false);
        setSelectedProduct(null);
      }
      return;
    }
    
    // Иначе показываем модалку выбора действия
    setIsActionModalOpen(true);
    console.log('Выбран товар:', product);
    
    // Вызываем callback если передан
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const handleActionModalClose = () => {
    setIsActionModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateOrder = (orderData: any) => {
    console.log('Создание заказа:', orderData);
    // Здесь будет логика создания заказа
    setIsCreateModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateAnonymous = () => {
    console.log('Создать ноунэйм заказ');
    setIsActionModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateWithGuest = () => {
    console.log('Создать заказ с гостем');
    setIsActionModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleAddToActive = () => {
    console.log('Добавить к активному заказу');
    setIsActionModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className={`${styles.productSelectorContainer} ${className || ''}`}>
      {showHeader && (
        <div className={styles.header}>
          <h1>{headerTitle}</h1>
          {showManageButton && (
            <div className={styles.headerActions}>
              <a href={manageButtonLink} className={styles.manageButton}>
                {manageButtonText}
              </a>
            </div>
          )}
        </div>
      )}

      <ProductGrid onProductClick={handleProductClick} refreshTrigger={refreshTrigger} />
      
      <OrderActionModal
        product={selectedProduct}
        open={isActionModalOpen}
        onCancel={handleActionModalClose}
        onCreateAnonymous={handleCreateAnonymous}
        onCreateWithGuest={handleCreateWithGuest}
        onAddToActive={handleAddToActive}
      />
      
      <CreateOrderModal
        product={selectedProduct}
        open={isCreateModalOpen}
        onCancel={handleCreateModalClose}
        onCreateOrder={handleCreateOrder}
      />
    </div>
  );
};

export default ProductSelector;
