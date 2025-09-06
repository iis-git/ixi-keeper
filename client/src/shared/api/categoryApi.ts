import { api } from './base';

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

export const categoryApi = {
  getAllCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get<Category[]>('/categories');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw new Error('Не удалось загрузить категории');
    }
  },
};
