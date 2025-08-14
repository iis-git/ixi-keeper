import React, { useState } from 'react';
import { ProductGrid } from '../../display';
import type { Product } from '../../../../entities/product/model/types';
import styles from './ProductSelector.module.scss';

interface ProductSelectorProps {
  onProductSelect?: (product: Product) => void;
  showSelectedProduct?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  showManageButton?: boolean;
  manageButtonText?: string;
  manageButtonLink?: string;
  className?: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  onProductSelect,
  showSelectedProduct = true,
  showHeader = true,
  headerTitle = 'Выбор товаров',
  showManageButton = true,
  manageButtonText = 'Управление товарами',
  manageButtonLink = '/products',
  className
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    console.log('Выбран товар:', product);
    
    // Вызываем callback если передан
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const clearSelection = () => {
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

      {showSelectedProduct && selectedProduct && (
        <div className={styles.selectedProduct}>
          <h3>Выбранный товар:</h3>
          <div className={styles.productInfo}>
            <span className={styles.productName}>{selectedProduct.name}</span>
            <span className={styles.productPrice}>{selectedProduct.price} ₽</span>
            {selectedProduct.category && (
              <span 
                className={styles.categoryBadge}
                style={{ backgroundColor: selectedProduct.category.color }}
              >
                {selectedProduct.category.name}
              </span>
            )}
            {selectedProduct.isComposite && (
              <span className={styles.compositeLabel}>
                Коктейль
              </span>
            )}
          </div>
          <button 
            className={styles.clearButton}
            onClick={clearSelection}
          >
            Очистить выбор
          </button>
        </div>
      )}

      <ProductGrid onProductClick={handleProductClick} />
    </div>
  );
};

export default ProductSelector;
