export interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  products?: Product[];
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: number;
}

// Импортируем Product из entities/product
import type { Product } from '../../product/model/types';
