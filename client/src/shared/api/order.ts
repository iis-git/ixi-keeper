import { api } from './base';

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface WriteOff {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
  product?: { id: number; name: string; unit?: string };
}

export interface Order {
  id: number;
  guestName: string;
  guestsCount?: number;
  orderItems: OrderItem[];
  totalAmount: number;
  discountPercent?: number;
  discountAmount?: number;
  netAmount?: number;
  shiftId?: number;
  status: 'active' | 'completed' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'transfer';
  comment?: string;
  createdAt: string;
  closedAt?: string;
}

export interface CreateOrderData {
  guestName: string;
  guestsCount?: number;
  orderItems: OrderItem[];
  totalAmount: number;
  status?: 'active' | 'completed' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'transfer';
  comment?: string;
}

export interface UpdateOrderData {
  guestName?: string;
  guestsCount?: number;
  status?: 'active' | 'completed' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'transfer';
  comment?: string;
  orderItems?: OrderItem[];
  guestId?: number;
}

export const orderApi = {
  getAll: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return api.get<Order[]>(`/orders${params}`);
  },

  getById: (id: number) => api.get<Order>(`/orders/${id}`),

  create: (data: CreateOrderData) => api.post<Order>('/orders', data),

  update: (id: number, data: UpdateOrderData) => api.put<Order>(`/orders/${id}`, data),

  delete: (id: number) => api.delete(`/orders/${id}`),

  // Специальные методы для работы с заказами
  complete: (id: number, paymentMethod: 'cash' | 'card' | 'transfer', comment?: string, closedByUserId?: number) =>
    api.put<Order>(`/orders/${id}`, { 
      status: 'completed', 
      paymentMethod,
      comment,
      closedByUserId,
    }),

  cancel: (id: number, comment?: string) =>
    api.put<Order>(`/orders/${id}`, { 
      status: 'cancelled',
      comment 
    }),

  getActive: () => api.get<Order[]>('/orders?status=active'),

  // Удаление позиции из заказа
  removeItem: (orderId: number, itemIndex: number) =>
    api.put<Order>(`/orders/${orderId}/remove-item`, { itemIndex }),

  // Добавление товара к заказу
  addItem: (orderId: number, productId: number, quantity: number = 1) =>
    api.put<Order>(`/orders/${orderId}/add-item`, { productId, quantity }),

  // Списания
  getWriteOffs: (orderId: number) => api.get<WriteOff[]>(`/orders/${orderId}/write-offs`),
  createWriteOff: (orderId: number, payload: { productId: number; quantity: number; reason?: string }) =>
    api.post<WriteOff>(`/orders/${orderId}/write-offs`, payload),

  // Установка скидки на активный заказ
  setDiscount: (orderId: number, discountPercent: number) =>
    api.put<Order>(`/orders/${orderId}/discount`, { discountPercent }),
};
