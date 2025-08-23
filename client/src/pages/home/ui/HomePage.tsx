import { FC, useState } from 'react';
import { ProductSelector } from '../../../features/product/selector';
import { ActiveOrders } from '../../../features/orders/active-orders';
import type { Product } from '../../../entities/product/model/types';
import styles from './HomePage.module.scss';

export const HomePage: FC = () => {
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleProductSelect = (product: Product) => {
    console.log('Выбран товар:', product);
    // Здесь будет логика добавления в заказ
  };

  const handleOrderUpdate = () => {
    // Обновляем список активных заказов через изменение trigger
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className={styles.home}>
      <div className={styles.sidebar}>
        <ActiveOrders 
          onOrderToggle={setOpenOrderId}
          openOrderId={openOrderId}
          refreshTrigger={refreshTrigger}
        />
      </div>
      
      <div className={styles.mainContent}>
        <ProductSelector 
          onProductSelect={handleProductSelect}
          openOrderId={openOrderId}
          onOrderUpdate={handleOrderUpdate}
          headerTitle="Выбор товаров"
          manageButtonText="Управление товарами"
          manageButtonLink="/products"
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
};

export default HomePage;
