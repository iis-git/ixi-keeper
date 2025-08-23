export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  categoryId?: number;
  category?: Category;
  stock: number;
  unitSize: number;
  unit: string;
  color: string;
  isActive: boolean;
  isComposite: boolean;
  ingredients?: ProductIngredient[];
  calculatedStock?: number;
  availablePortions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  categoryId?: number;
  stock: number;
  unitSize: number;
  unit: string;
  color?: string;
  isActive?: boolean;
  isComposite?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: number;
  stock?: number;
  unitSize?: number;
  unit?: string;
  color?: string;
  isActive?: boolean;
  isComposite?: boolean;
  id: number;
}

// Типы для работы с ингредиентами составных товаров
export interface ProductIngredient {
  id: number;
  compositeProductId: number;
  ingredientProductId: number;
  quantity: number;
  ingredientProduct: {
    id: number;
    name: string;
    stock: number;
    unit: string;
    price?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateIngredientData {
  ingredientProductId: number;
  quantity: number;
}

// Импортируем Category из entities/category
import type { Category } from '../../category/model/types';
