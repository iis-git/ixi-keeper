import { api } from './base';
import type { Product, CreateProductData, UpdateProductData, ProductIngredient, CreateIngredientData } from '../../entities/product/model/types';

export const productApi = {
  // Получить все товары
  getAll: () => api.get<Product[]>('/products'),
  
  // Получить товар по ID
  getById: (id: number) => api.get<Product>(`/products/${id}`),
  
  // Создать новый товар
  create: (data: CreateProductData) => api.post<Product>('/products', data),
  
  // Обновить товар
  update: (id: number, data: Partial<UpdateProductData>) => 
    api.put<Product>(`/products/${id}`, data),
  
  // Удалить товар
  delete: (id: number) => api.delete(`/products/${id}`),

  // API для работы с ингредиентами составных товаров
  ingredients: {
    // Получить ингредиенты составного товара
    getByProductId: (productId: number) => 
      api.get<ProductIngredient[]>(`/products/${productId}/ingredients`),
    
    // Добавить ингредиент к составному товару
    create: (productId: number, data: CreateIngredientData) => 
      api.post<ProductIngredient>(`/products/${productId}/ingredients`, data),
    
    // Обновить количество ингредиента
    update: (productId: number, ingredientId: number, data: { quantity: number }) => 
      api.put<ProductIngredient>(`/products/${productId}/ingredients/${ingredientId}`, data),
    
    // Удалить ингредиент из состава
    delete: (productId: number, ingredientId: number) => 
      api.delete(`/products/${productId}/ingredients/${ingredientId}`),
  }
};
