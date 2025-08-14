import React from 'react';
import { ProductSelector } from '../../../features/product/selector';
import type { Product } from '../../../entities/product/model/types';

const ProductDisplayPage: React.FC = () => {
  const handleProductSelect = (product: Product) => {
    console.log('Выбран товар:', product);
    // Здесь будет логика добавления в заказ (реализуем позже)
  };

  return (
    <ProductSelector 
      onProductSelect={handleProductSelect}
      headerTitle="Выбор товаров"
      manageButtonText="Управление товарами"
      manageButtonLink="/products"
    />
  );
};

export default ProductDisplayPage;
