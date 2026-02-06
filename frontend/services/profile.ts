import { api } from '@/lib/api';

export type Profile = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
};

export const getProfile = () => api.get<Profile>('/auth/profile');

export const updateProfile = (data: { name?: string; phone?: string }) =>
  api.patch<Profile>('/auth/profile', data);
