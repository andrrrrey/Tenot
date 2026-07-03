import { api } from '@/lib/api';
import type { Listing } from './listings';

export type AdminUser = { id: number; email: string; name?: string; role: 'USER' | 'ADMIN'; createdAt: string };
export type Stats = { users: number; listings: number; chats: number; messages: number; reviews: number; pendingReviews: number };

export type AdminReview = {
  id: number;
  authorId: number;
  targetId: number;
  rating: number;
  satisfaction: string;
  liked: string;
  disliked: string;
  listingId: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  author: { id: number; email: string; name: string | null; avatarUrl: string | null };
  target: { id: number; email: string; name: string | null };
  listing?: { id: number; title: string } | null;
};

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

export const adminChangeListingOwner = (id: number, userId: number) =>
  api.patch<Listing>(`/admin/listings/${id}/owner`, { userId });

export const adminBulkChangeOwner = (listingIds: number[], userId: number) =>
  api.patch<{ count: number }>(`/admin/listings/bulk-owner`, { listingIds, userId });

export const adminGetStats = () => api.get<Stats>('/admin/stats');

export const adminGetReviews = (status?: string) =>
  api.get<AdminReview[]>(`/admin/reviews${status ? `?status=${status}` : ''}`);

export const adminApproveReview = (id: number) =>
  api.patch<AdminReview>(`/admin/reviews/${id}/approve`);

export const adminRejectReview = (id: number) =>
  api.patch<AdminReview>(`/admin/reviews/${id}/reject`);
