import React, { useState } from 'react';
import { ProductSelector } from '../ui/ProductSelector';
import type { Product } from '../../../../entities/product/model/types';
import styles from './ProductSelectorExamples.module.scss';

const ProductSelectorExamples: React.FC = () => {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const handleProductSelect = (product: Product) => {
    setSelectedProducts(prev => [...prev, product]);
    console.log('Товар добавлен в список:', product);
  };

  const handleModalProductSelect = (product: Product) => {
    console.log('Товар выбран в модальном окне:', product);
    setModalOpen(false);
  };

  const clearSelectedProducts = () => {
    setSelectedProducts([]);
  };

  return (
    <div className={styles.examplesContainer}>
      <h1>Примеры использования ProductSelector</h1>
      
      {/* Пример 1: Полная версия */}
      <section className={styles.example}>
        <h2>1. Полная версия (как на странице выбора товаров)</h2>
        <ProductSelector 
          onProductSelect={handleProductSelect}
          headerTitle="Выбор товаров для заказа"
          manageButtonText="Управление товарами"
          manageButtonLink="/products"
        />
      </section>

      {/* Пример 2: Компактная версия */}
      <section className={styles.example}>
        <h2>2. Компактная версия</h2>
        <div className={styles.compactContainer}>
          <ProductSelector 
            onProductSelect={handleProductSelect}
            headerTitle="Компактный выбор"
            showManageButton={false}
            className="compact"
          />
        </div>
      </section>

      {/* Пример 3: Встроенная версия без заголовка */}
      <section className={styles.example}>
        <h2>3. Встроенная версия (без заголовка и выбранного товара)</h2>
        <div className={styles.embeddedContainer}>
          <ProductSelector 
            onProductSelect={handleProductSelect}
            showHeader={false}
            showSelectedProduct={false}
            className="embedded"
          />
        </div>
      </section>

      {/* Пример 4: Модальное окно */}
      <section className={styles.example}>
        <h2>4. В модальном окне</h2>
        <button 
          className={styles.openModalButton}
          onClick={() => setModalOpen(true)}
        >
          Открыть выбор товаров в модальном окне
        </button>

        {modalOpen && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Выберите товар</h3>
                <button 
                  className={styles.closeButton}
                  onClick={() => setModalOpen(false)}
                >
                  ×
                </button>
              </div>
              <ProductSelector 
                onProductSelect={handleModalProductSelect}
                showHeader={false}
                showSelectedProduct={true}
                className="compact"
              />
            </div>
          </div>
        )}
      </section>

      {/* Список выбранных товаров */}
      {selectedProducts.length > 0 && (
        <section className={styles.selectedProductsList}>
          <h2>Выбранные товары ({selectedProducts.length})</h2>
          <div className={styles.productsList}>
            {selectedProducts.map((product, index) => (
              <div key={`${product.id}-${index}`} className={styles.selectedProductItem}>
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
                  <span className={styles.compositeLabel}>Коктейль</span>
                )}
              </div>
            ))}
          </div>
          <button 
            className={styles.clearButton}
            onClick={clearSelectedProducts}
          >
            Очистить список
          </button>
        </section>
      )}
    </div>
  );
};

export default ProductSelectorExamples;
