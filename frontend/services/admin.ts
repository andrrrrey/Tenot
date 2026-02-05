import { api } from '@/lib/api';
import type { Listing } from './listings';

export type AdminUser = { id: number; email: string; role: 'USER' | 'ADMIN'; createdAt: string };
export type Stats = { users: number; listings: number; chats: number; messages: number };

export const adminGetUsers = () => api.get<AdminUser[]>('/admin/users');
export const adminSetUserRole = (id: number, role: AdminUser['role']) =>
  api.patch<AdminUser>(`/admin/users/${id}/role`, { role });

export const adminGetListings = () => api.get<Listing[]>('/admin/listings');
export const adminToggleListing = (id: number, isActive: boolean) =>
  api.patch<Listing>(`/admin/listings/${id}/toggle`, { isActive });

export const adminGetStats = () => api.get<Stats>('/admin/stats');
