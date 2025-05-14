import { api } from './base';
import { User } from '../types/model';

export const userApi = {
  getAll: () => api.get<User[]>('/users'),
  getById: (id: number) => api.get<User>(`/users/${id}`),
  create: (user: Partial<User>) => api.post<User>('/users', user),
  update: (id: number, user: Partial<User>) => api.put<User>(`/users/${id}`, user),
  delete: (id: number) => api.delete(`/users/${id}`),
};
