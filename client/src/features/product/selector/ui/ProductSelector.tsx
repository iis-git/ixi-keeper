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
        
        return;
      } catch (error: any) {
        console.error('Ошибка при добавлении товара к заказу:', error);
        
        // Если заказ не найден (404) - сбрасываем openOrderId
        if (error.response?.status === 404) {
          console.log('Активный заказ не найден, сбрасываем openOrderId');
          if (onOrderUpdate) {
            onOrderUpdate(); // Это обновит состояние и сбросит openOrderId
          }
        } else {
          alert(error.response?.data?.message || 'Ошибка при добавлении товара к заказу');
          return;
        }
      } finally {
        setIsLoading(false);
      }
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

  const handleCreateOrder = async (orderData: any) => {
    try {
      // Создаем заказ через API
      const totalAmount = Number(orderData.product.price) * orderData.quantity;
      const newOrder = await orderApi.create({
        guestName: orderData.guestName,
        comment: orderData.comment,
        totalAmount: totalAmount,
        orderItems: [{
          productId: orderData.product.id,
          productName: orderData.product.name,
          price: orderData.product.price,
          quantity: orderData.quantity
        }]
      });
      
      console.log('Заказ создан:', newOrder);
      
      // Обновляем список заказов
      if (onOrderUpdate) {
        onOrderUpdate();
      }
      
      setIsCreateModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Ошибка создания заказа:', error);
      alert('Ошибка при создании заказа');
    }
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
     

      <ProductGrid onProductClick={handleProductClick} refreshTrigger={refreshTrigger} />
      
      <OrderActionModal
        product={selectedProduct}
        open={isActionModalOpen}
        onCancel={handleActionModalClose}
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
