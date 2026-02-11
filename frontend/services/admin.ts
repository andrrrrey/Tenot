import { api } from '@/lib/api';
import type { Listing } from './listings';

export type AdminUser = { id: number; email: string; name?: string; role: 'USER' | 'ADMIN'; createdAt: string };
export type Stats = { users: number; listings: number; chats: number; messages: number };

export const adminGetUsers = () => api.get<AdminUser[]>('/admin/users');
export const adminSetUserRole = (id: number, role: AdminUser['role']) =>
  api.patch<AdminUser>(`/admin/users/${id}/role`, { role });

export const adminGetListings = (filters?: {
  search?: string;
  categoryId?: number;
  userId?: number;
  isActive?: boolean;
}) => {
  const qs = new URLSearchParams();
  if (filters?.search) qs.set('search', filters.search);
  if (filters?.categoryId) qs.set('categoryId', String(filters.categoryId));
  if (filters?.userId) qs.set('userId', String(filters.userId));
  if (filters?.isActive !== undefined) qs.set('isActive', String(filters.isActive));
  const q = qs.toString();
  return api.get<Listing[]>(`/admin/listings${q ? `?${q}` : ''}`);
};

export const adminToggleListing = (id: number, isActive: boolean) =>
  api.patch<Listing>(`/admin/listings/${id}/toggle`, { isActive });

export const adminGetStats = () => api.get<Stats>('/admin/stats');
