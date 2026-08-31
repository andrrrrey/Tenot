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

export const getCategoryFields = (categoryId: number) =>
  api.get<CategoryField[]>(`/categories/${categoryId}/fields`);

export type TemplateSyncResult = {
  skipped: boolean;
  version: number;
  categories: number;
  fields: number;
  addedCategories: number;
  addedFields: number;
};

export const syncCategoryTemplates = () =>
  api.post<TemplateSyncResult>('/categories/sync-templates', {});

export const createCategoryField = (categoryId: number, field: Partial<CategoryField> & { label: string }) =>
  api.post<CategoryField>(`/categories/${categoryId}/fields`, field);

export const updateCategoryField = (categoryId: number, fieldId: number, field: Partial<CategoryField>) =>
  api.patch<CategoryField>(`/categories/${categoryId}/fields/${fieldId}`, field);

export const deleteCategoryField = (categoryId: number, fieldId: number) =>
  api.del<CategoryField>(`/categories/${categoryId}/fields/${fieldId}`);

export const deleteCategory = (id: number, force = false) =>
  api.del<{ deleted: boolean; count: number }>(`/categories/${id}${force ? '?force=true' : ''}`);
