import { api } from './base';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../entities/category/model/types';

export const categoryApi = {
  // Получить все категории
  getAll: () => api.get<Category[]>('/categories'),
  
  // Получить категорию по ID
  getById: (id: number) => api.get<Category>(`/categories/${id}`),
  
  // Создать новую категорию
  create: (data: CreateCategoryData) => api.post<Category>('/categories', data),
  
  // Обновить категорию
  update: (id: number, data: Partial<UpdateCategoryData>) => 
    api.put<Category>(`/categories/${id}`, data),
  
  // Удалить категорию
  delete: (id: number) => api.delete(`/categories/${id}`),
};
