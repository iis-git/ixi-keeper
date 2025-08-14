import { FC } from 'react';
import { ProductSelector } from '../../../features/product/selector';
import type { Product } from '../../../entities/product/model/types';
import styles from './HomePage.module.scss';

export const HomePage: FC = () => {
  const handleProductSelect = (product: Product) => {
    console.log('Выбран товар:', product);
    // Здесь будет логика добавления в заказ
  };

  return (
    <div className={styles.home}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <h2>Панель управления</h2>
          <p>Быстрый доступ к основным функциям</p>
          {/* Здесь можно добавить дополнительные элементы управления */}
        </div>
      </div>
      
      <div className={styles.mainContent}>
        <ProductSelector 
          onProductSelect={handleProductSelect}
          headerTitle="Выбор товаров"
          manageButtonText="Управление товарами"
          manageButtonLink="/products"
        />
      </div>
    </div>
  );
};

export default HomePage;
