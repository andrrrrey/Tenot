import { api } from '@/lib/api';

export type CityType = 'REGION' | 'CITY' | 'VILLAGE' | 'TOWN';

export type City = {
  id: number;
  name: string;
  type: CityType;
  regionId: number | null;
  region: { id: number; name: string } | null;
};

export const getCities = () => api.get<City[]>('/cities');

export const searchCities = (q: string) =>
  api.get<City[]>(`/cities/search?q=${encodeURIComponent(q)}`);
