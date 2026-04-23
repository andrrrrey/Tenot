import { api } from '@/lib/api';

export type CarMake = {
  id: number;
  name: string;
};

export type CarModel = {
  id: number;
  name: string;
  generation: string | null;
  yearFrom: number;
  yearTo: number | null;
};

export const getCarMakes = () => api.get<CarMake[]>('/car-makes');

export const getCarModels = (makeId: number) =>
  api.get<CarModel[]>(`/car-makes/${makeId}/models`);
