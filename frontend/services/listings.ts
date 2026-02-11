import { api } from '@/lib/api';

export type Listing = {
  id: number;
  title: string;
  article: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  category: { id: number; name: string };
  images: { id: number; url: string }[];
  user: { id: number; email: string; name?: string; phone?: string; cityId?: number; city?: { id: number; name: string } | null };
  cityId: number | null;
  city: { id: number; name: string } | null;
};

export const getListings = (params?: {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  cityId?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set('categoryId', String(params.categoryId));
  if (params?.minPrice !== undefined) qs.set('minPrice', String(params.minPrice));
  if (params?.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
  if (params?.search) qs.set('search', params.search);
  if (params?.cityId) qs.set('cityId', String(params.cityId));
  const q = qs.toString();
  return api.get<Listing[]>(`/listings${q ? `?${q}` : ''}`);
};

export const getListing = (id: number) => api.get<Listing>(`/listings/${id}`);

export const getMyListings = () => api.get<Listing[]>('/listings/my');

export const createListing = (payload: {
  title: string;
  description: string;
  price: number;
  categoryId: number;
  cityId?: number;
}) => api.post<Listing>('/listings', payload);

export const updateListing = (
  id: number,
  payload: { title?: string; description?: string; price?: number; categoryId?: number; cityId?: number | null },
) => api.patch<Listing>(`/listings/${id}`, payload);

export const toggleListing = (id: number, isActive: boolean) =>
  api.patch<Listing>(`/listings/${id}/toggle`, { isActive });

export const deleteListing = (id: number) =>
  api.del<{ deleted: boolean }>(`/listings/${id}`);
