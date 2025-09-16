import { api } from './base';

export interface Shift {
  id: number;
  openedAt: string;
  closedAt?: string | null;
  openedByUserId?: number | null;
  status: 'open' | 'closed';
  openingNote?: string | null;
  closingNote?: string | null;
  openingCashAmount?: number | null;
  closingCashAmount?: number | null;
  summary?: any;
}

export const shiftApi = {
  getActive: () => api.get<{ shift: Shift; bartenders: { id: number; userId: number; user?: { id: number; name: string } }[] } | void>('/shifts/active'),
  list: () => api.get<Shift[]>('/shifts'),
  getById: (id: number) => api.get<{ shift: Shift; bartenders: { id: number; userId: number; user?: { id: number; name: string } }[] }>(`/shifts/${id}`),
  getOrders: (id: number) => api.get<any[]>(`/shifts/${id}/orders`),
  open: (payload: { bartenders: number[]; openingNote?: string; openingCashAmount?: number; openedByUserId?: number }) =>
    api.post<Shift>('/shifts/open', payload),
  close: (id: number, payload: { closingNote?: string; closingCashAmount?: number }) =>
    api.post<Shift>(`/shifts/${id}/close`, payload),
};
