import { api } from '@/lib/api';

export type City = {
  id: number;
  name: string;
};

export const getCities = () => api.get<City[]>('/cities');
