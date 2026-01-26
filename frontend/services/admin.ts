import { api } from '@/lib/api';
import type { Listing } from './listings';

export type AdminUser = { id: number; email: string; role: 'BUYER' | 'SUPPLIER' | 'ADMIN'; createdAt: string };
export type Stats = { users: number; listings: number; chats: number; messages: number };

export type DayActivity = {
  date: string;
  users: number;
  listings: number;
  messages: number;
};

export type CategoryStat = {
  id: number;
  name: string;
  count: number;
};

export type RecentListing = {
  id: number;
  title: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  category: { name: string } | null;
  supplier: { name: string } | null;
};

export type DashboardStats = {
  overview: {
    totalUsers: number;
    totalListings: number;
    totalChats: number;
    totalMessages: number;
    activeListings: number;
    inactiveListings: number;
  };
  usersByRole: {
    buyers: number;
    suppliers: number;
    admins: number;
  };
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  newListings: {
    today: number;
    week: number;
    month: number;
  };
  messagesActivity: {
    today: number;
    week: number;
  };
  listingsByCategory: CategoryStat[];
  recentUsers: AdminUser[];
  recentListings: RecentListing[];
  pendingModeration: RecentListing[];
  activityByDay: DayActivity[];
};

export const adminGetUsers = () => api.get<AdminUser[]>('/admin/users');
export const adminSetUserRole = (id: number, role: AdminUser['role']) =>
  api.patch<AdminUser>(`/admin/users/${id}/role`, { role });

export const adminGetListings = () => api.get<Listing[]>('/admin/listings');
export const adminToggleListing = (id: number, isActive: boolean) =>
  api.patch<Listing>(`/admin/listings/${id}/toggle`, { isActive });

export const adminGetStats = () => api.get<Stats>('/admin/stats');
export const adminGetDashboard = () => api.get<DashboardStats>('/admin/dashboard');
