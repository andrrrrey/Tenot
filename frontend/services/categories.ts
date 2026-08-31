import { api } from '@/lib/api';

export type Category = {
  id: number;
  name: string;
  imageUrl?: string | null;
  parentId?: number | null;
  hasCarFilter?: boolean;
  filterProfile?: string | null;
  templateKey?: string | null;
  children?: Category[];
};

export type FilterProfile = { value: string; label: string };

export type CategoryField = {
  id: number;
  categoryId: number;
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT';
  unit?: string | null;
  options?: string[] | null;
  required: boolean;
  filterable: boolean;
  showInForm: boolean;
  sortOrder: number;
};

export const getCategories = () => api.get<Category[]>('/categories');

export const createCategory = (data: { name: string; image?: File; parentId?: number; filterProfile?: string }) => {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.image) formData.append('image', data.image);
  if (data.parentId !== undefined) formData.append('parentId', String(data.parentId));
  if (data.filterProfile) formData.append('filterProfile', data.filterProfile);
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

export const getFilterProfiles = () => api.get<FilterProfile[]>('/categories/filter-profiles');

export const getCategoryFields = (categoryId: number) =>
  api.get<CategoryField[]>(`/categories/${categoryId}/fields`);

export const updateCategoryFilterProfile = (id: number, filterProfile: string) => {
  const formData = new FormData();
  formData.append('filterProfile', filterProfile);
  return api.upload<Category>(`/categories/${id}`, formData, 'PATCH');
};

export const importCategoryProfile = (filterProfile: string) =>
  api.post<Category>('/categories/import-profile', { filterProfile });

export const createCategoryField = (categoryId: number, field: Partial<CategoryField> & { label: string }) =>
  api.post<CategoryField>(`/categories/${categoryId}/fields`, field);

export const updateCategoryField = (categoryId: number, fieldId: number, field: Partial<CategoryField>) =>
  api.patch<CategoryField>(`/categories/${categoryId}/fields/${fieldId}`, field);

export const deleteCategoryField = (categoryId: number, fieldId: number) =>
  api.del<CategoryField>(`/categories/${categoryId}/fields/${fieldId}`);

export const deleteCategory = (id: number) => api.del<any>(`/categories/${id}`);
