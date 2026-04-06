import { api } from '@/lib/api';

export type Review = {
  id: number;
  authorId: number;
  targetId: number;
  rating: number;
  satisfaction: string;
  liked: string;
  disliked: string;
  listingId: number | null;
  status: string;
  createdAt: string;
  author: { id: number; name: string | null; avatarUrl: string | null };
  listing?: { id: number; title: string } | null;
};

export type ReviewStats = {
  average: number;
  count: number;
};

export const createReview = (data: {
  targetId: number;
  rating: number;
  satisfaction: string;
  liked: string;
  disliked: string;
  listingId?: number;
}) => api.post<Review>('/reviews', data);

export const getUserReviews = (userId: number) =>
  api.get<Review[]>(`/reviews/user/${userId}`);

export const getUserReviewStats = (userId: number) =>
  api.get<ReviewStats>(`/reviews/user/${userId}/stats`);

export const getMyReviews = () =>
  api.get<Review[]>('/reviews/my');
