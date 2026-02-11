import { api } from '@/lib/api';

export type UserProfile = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  cityId: number | null;
  city: { id: number; name: string } | null;
};

export type PublicUserProfile = {
  id: number;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  cityId: number | null;
  city: { id: number; name: string } | null;
};

export const getMyProfile = () => api.get<UserProfile>('/users/me');

export const updateMyProfile = (data: { name?: string; phone?: string; cityId?: number | null }) =>
  api.patch<UserProfile>('/users/me', data);

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return api.upload<UserProfile>('/users/me/avatar', formData, 'POST');
};

export const getPublicProfile = (userId: number) =>
  api.get<PublicUserProfile>(`/users/${userId}/public`);
