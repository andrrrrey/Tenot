import { api } from '@/lib/api';

export type Category = {
  id: number;
  name: string;
  imageUrl?: string | null;
  parentId?: number | null;
  children?: Category[];
};

export const getCategories = () => api.get<Category[]>('/categories');

export const createCategory = (data: { name: string; imageUrl?: string; parentId?: number }) =>
  api.post<Category>('/categories', data);

export const updateCategory = (id: number, data: { name?: string; imageUrl?: string }) =>
  api.patch<Category>(`/categories/${id}`, data);

export const deleteCategory = (id: number) => api.del<any>(`/categories/${id}`);
