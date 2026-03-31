import { api } from '@/lib/api';

export type Category = {
  id: number;
  name: string;
  imageUrl?: string | null;
  parentId?: number | null;
  hasCarFilter?: boolean;
  children?: Category[];
};

export const getCategories = () => api.get<Category[]>('/categories');

export const createCategory = (data: { name: string; image?: File; parentId?: number }) => {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.image) formData.append('image', data.image);
  if (data.parentId !== undefined) formData.append('parentId', String(data.parentId));
  return api.upload<Category>('/categories', formData, 'POST');
};

export const updateCategoryImage = (id: number, image: File) => {
  const formData = new FormData();
  formData.append('image', image);
  return api.upload<Category>(`/categories/${id}`, formData, 'PATCH');
};

export const updateCategoryCarFilter = (id: number, hasCarFilter: boolean) => {
  const formData = new FormData();
  formData.append('hasCarFilter', String(hasCarFilter));
  return api.upload<Category>(`/categories/${id}`, formData, 'PATCH');
};
