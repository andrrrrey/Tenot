import { api } from '@/lib/api';
import type { Listing } from './listings';

export type Favorite = { id: number; listingId: number; userId: number; listing: Listing };

export const getFavorites = () => api.get<Favorite[]>('/favorites');
export const addFavorite = (listingId: number) => api.post<Favorite>('/favorites', { listingId });
export const removeFavorite = (listingId: number) => api.del<any>(`/favorites?listingId=${listingId}`);
