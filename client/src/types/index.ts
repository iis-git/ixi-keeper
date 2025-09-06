export interface User {
  id?: number;
  name: string;
  phone: string;
  totalOrdersAmount: number;
  visitCount: number;
  averageCheck: number;
  guestType?: 'owner' | 'guest' | 'regular' | 'bartender';
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  data?: any;
}
