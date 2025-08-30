import React, { useState } from 'react';
import { ProductGrid } from '../../display';
import { CreateOrderModal } from '../../../orders/create-order';
import { PaymentModal } from '../../../orders/payment-modal';
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
  // Убрали шаг выбора действия: больше не используем модалку действий

  // Состояние оплаты для быстрого заказа
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [paymentGuestName, setPaymentGuestName] = useState<string>('');
  const [paymentTotal, setPaymentTotal] = useState<number>(0);

  const handleProductClick = async (product: Product) => {
    setSelectedProduct(product);
    
    // Если есть открытый заказ - добавляем товар к нему
    if (openOrderId) {
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
        // no-op
      }
    }
    
    // Иначе сразу открываем модалку создания заказа
    setIsCreateModalOpen(true);
    console.log('Выбран товар:', product);
    
    // Вызываем callback если передан
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  // Модалка действий больше не используется

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateOrder = async (orderData: any) => {
    try {
      // Создаем заказ через API
      const totalAmount = Number(orderData.product.price) * orderData.quantity;
      const response = await orderApi.create({
        guestName: orderData.guestName,
        comment: orderData.comment,
        guestsCount: orderData.guestsCount,
        totalAmount: totalAmount,
        orderItems: [{
          productId: orderData.product.id,
          productName: orderData.product.name,
          price: orderData.product.price,
          quantity: orderData.quantity
        }]
      });
      
      console.log('Заказ создан:', response);
      
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


  // Создание заказа теперь открывается напрямую в handleProductClick

  // Добавление к активному оставлено выше (в ветке openOrderId)

  const handleQuickOrder = async (orderData: any) => {
    try {
      const totalAmount = Number(orderData.product.price) * orderData.quantity;
      const response = await orderApi.create({
        guestName: orderData.guestName,
        comment: orderData.comment,
        guestsCount: orderData.guestsCount,
        totalAmount,
        orderItems: [{
          productId: orderData.product.id,
          productName: orderData.product.name,
          price: orderData.product.price,
          quantity: orderData.quantity,
        }],
      });

      const created = response.data;
      // Закрыть форму создания
      setIsCreateModalOpen(false);
      
      // Открыть модалку оплаты с данными нового заказа
      setPaymentOrderId(created.id);
      setPaymentGuestName(created.guestName);
      setPaymentTotal(Number(created.totalAmount));
      setIsPaymentOpen(true);

      // Обновить список активных заказов (новый появится в правой панели)
      if (onOrderUpdate) onOrderUpdate();
    } catch (error) {
      console.error('Ошибка быстрого заказа:', error);
      alert('Ошибка при создании быстрого заказа');
    }
  };

  const handlePayment = async (paymentMethod: 'cash' | 'card' | 'transfer', comment?: string) => {
    if (!paymentOrderId) return;
    try {
      await orderApi.complete(paymentOrderId, paymentMethod, comment);
      setIsPaymentOpen(false);
      setPaymentOrderId(null);
      // Обновить активные заказы
      if (onOrderUpdate) onOrderUpdate();
    } catch (error) {
      console.error('Ошибка оплаты заказа:', error);
      alert('Ошибка при оплате заказа');
    }
  };

  const handlePaymentClose = () => {
    setIsPaymentOpen(false);
    setPaymentOrderId(null);
  };

  return (
    <div className={`${styles.productSelectorContainer} ${className || ''}`}>
     

      <ProductGrid onProductClick={handleProductClick} refreshTrigger={refreshTrigger} />
      
      {/* OrderActionModal удален: сразу открываем CreateOrderModal */}
      
      <CreateOrderModal
        product={selectedProduct}
        open={isCreateModalOpen}
        onCancel={handleCreateModalClose}
        onCreateOrder={handleCreateOrder}
        onQuickOrder={handleQuickOrder}
      />

      <PaymentModal
        visible={isPaymentOpen}
        onClose={handlePaymentClose}
        onPayment={handlePayment}
        orderTotal={paymentTotal}
        guestName={paymentGuestName}
      />
    </div>
  );
};

export default ProductSelector;
