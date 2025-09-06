import { api } from './base';

export interface ProductAnalytic {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  totalCostAmount: number;
  orderCount: number;
  lastOrderDate: string;
  currentPrice: number;
  currentCostPrice: number;
  profit: number;
  profitMargin: number;
  averageOrderQuantity: number;
  unit: string;
  category: {
    name: string;
    color: string;
  } | null;
  // Новые поля c учётом списаний
  writeOffQuantity?: number;
  writeOffCostAmount?: number;
  netQuantity?: number;
  netAmount?: number;
  netProfit?: number;
  netMargin?: number;
}

export interface GetProductAnalyticsResponse {
  stats: ProductAnalytic[];
  total: number;
  page: number;
  pageSize: number;
}

export const analyticsApi = {
  getProductAnalytics: async (params: { 
    period?: string; 
    page?: number; 
    pageSize?: number; 
    search?: string;
    categoryId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
  }): Promise<GetProductAnalyticsResponse> => {
    const { data } = await api.get<GetProductAnalyticsResponse>('/products/analytics', { params });
    return data;
  }
};
