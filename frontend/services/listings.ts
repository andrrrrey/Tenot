import { api } from '@/lib/api';

export type ListingImage = {
  id: number;
  url: string;
  type: string;
  isCover: boolean;
  order: number;
};

export type Listing = {
  id: number;
  title: string;
  article: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  category: { id: number; name: string };
  images: ListingImage[];
  user: { id: number; email: string; name?: string; phone?: string; avatarUrl?: string | null; cityId?: number; city?: { id: number; name: string } | null };
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

// ── Media API ─────────────────────────────────────────────────────────────────

export const uploadListingMedia = (
  listingId: number,
  files: File[],
  coverIndex?: number,
) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  if (coverIndex !== undefined) formData.append('coverIndex', String(coverIndex));
  return api.upload<Listing>(`/listings/${listingId}/media`, formData, 'POST');
};

export const deleteListingMedia = (listingId: number, mediaId: number) =>
  api.del<{ deleted: boolean }>(`/listings/${listingId}/media/${mediaId}`);

export const setListingCover = (listingId: number, mediaId: number) =>
  api.patch<ListingImage>(`/listings/${listingId}/media/${mediaId}/cover`, {});

/** Helper: get the cover image URL (falls back to first image) */
export const getCoverUrl = (images: ListingImage[]): string | null => {
  if (!images?.length) return null;
  const cover = images.find((i) => i.type === 'image' && i.isCover);
  if (cover) return cover.url;
  const firstImage = images.find((i) => i.type === 'image');
  return firstImage?.url ?? null;
};
