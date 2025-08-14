# ProductSelector Component

Переиспользуемый компонент для выбора товаров, который можно использовать в любом месте приложения.

## Возможности

- Отображение сетки товаров с возможностью выбора
- Показ выбранного товара с детальной информацией
- Поддержка составных товаров (коктейлей)
- Настраиваемый заголовок и кнопки управления
- Различные режимы отображения (полный, компактный, встроенный)

## Пропсы

```typescript
interface ProductSelectorProps {
  onProductSelect?: (product: Product) => void;  // Callback при выборе товара
  showSelectedProduct?: boolean;                 // Показывать выбранный товар (по умолчанию true)
  showHeader?: boolean;                         // Показывать заголовок (по умолчанию true)
  headerTitle?: string;                         // Текст заголовка (по умолчанию "Выбор товаров")
  showManageButton?: boolean;                   // Показывать кнопку управления (по умолчанию true)
  manageButtonText?: string;                    // Текст кнопки управления (по умолчанию "Управление товарами")
  manageButtonLink?: string;                    // Ссылка кнопки управления (по умолчанию "/products")
  className?: string;                           // Дополнительные CSS классы
}
```

## Примеры использования

### 1. Базовое использование (как на странице product-display)

```tsx
import { ProductSelector } from '../../../features/product/selector';

const OrderPage = () => {
  const handleProductSelect = (product: Product) => {
    console.log('Добавляем в заказ:', product);
    // Логика добавления в заказ
  };

  return (
    <ProductSelector 
      onProductSelect={handleProductSelect}
      headerTitle="Выбор товаров для заказа"
      manageButtonText="Управление товарами"
      manageButtonLink="/products"
    />
  );
};
```

### 2. Компактная версия для модального окна

```tsx
import { ProductSelector } from '../../../features/product/selector';

const ProductSelectionModal = () => {
  return (
    <ProductSelector 
      onProductSelect={handleSelect}
      headerTitle="Выберите товар"
      showManageButton={false}
      className="compact"
    />
  );
};
```

### 3. Встроенная версия без заголовка

```tsx
import { ProductSelector } from '../../../features/product/selector';

const EmbeddedProductSelector = () => {
  return (
    <ProductSelector 
      onProductSelect={handleSelect}
      showHeader={false}
      showSelectedProduct={false}
      className="embedded"
    />
  );
};
```

### 4. Кастомизированная версия

```tsx
import { ProductSelector } from '../../../features/product/selector';

const CustomProductSelector = () => {
  return (
    <ProductSelector 
      onProductSelect={handleSelect}
      headerTitle="Выбор ингредиентов"
      manageButtonText="Добавить ингредиент"
      manageButtonLink="/products/new"
      showSelectedProduct={true}
    />
  );
};
```

## CSS классы для кастомизации

- `.compact` - компактная версия для модальных окон
- `.embedded` - встроенная версия без заголовка
- Можно передать свои классы через пропс `className`
