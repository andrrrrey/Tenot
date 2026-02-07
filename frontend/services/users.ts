import { api } from '@/lib/api';

export type UserProfile = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
};

export type PublicUserProfile = {
  id: number;
  name: string | null;
  phone: string | null;
  createdAt: string;
};

export const getMyProfile = () => api.get<UserProfile>('/users/me');

export const updateMyProfile = (data: { name?: string; phone?: string }) =>
  api.patch<UserProfile>('/users/me', data);

export const getPublicProfile = (userId: number) =>
  api.get<PublicUserProfile>(`/users/${userId}/public`);
