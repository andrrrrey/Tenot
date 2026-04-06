'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPublicProfile, type PublicUserProfile } from '@/services/users';
import { getUserListings, type Listing } from '@/services/listings';
import { getFavorites } from '@/services/favorites';
import { getUserReviews, getUserReviewStats, createReview, type Review, type ReviewStats } from '@/services/reviews';
import { ListingCard } from '@/components/ListingCard';
import { useMe } from '@/hooks/useMe';
import { IconPhone, IconMessage, IconMapPin, IconStar } from '@/components/Icons';
import { openChatForListing } from '@/components/ChatWidget';

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          size={size}
          color={i <= rating ? '#f59e0b' : 'var(--muted)'}
          style={{ fill: i <= rating ? '#f59e0b' : 'none' }}
        />
      ))}
    </span>
  );
}

function ClickableStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: 'inline-flex', gap: 4, cursor: 'pointer' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <IconStar
            size={28}
            color={i <= (hover || value) ? '#f59e0b' : 'var(--muted)'}
            style={{ fill: i <= (hover || value) ? '#f59e0b' : 'none', transition: 'all 0.15s' }}
          />
        </span>
      ))}
    </span>
  );
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useMe();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPhone, setShowPhone] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [hasMyReview, setHasMyReview] = useState(false);

  // Review form state
  const [formRating, setFormRating] = useState(0);
  const [formSatisfaction, setFormSatisfaction] = useState('');
  const [formLiked, setFormLiked] = useState('');
  const [formDisliked, setFormDisliked] = useState('');
  const [formListingId, setFormListingId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const userId = Number(id);
    Promise.all([
      getPublicProfile(userId),
      getUserListings(userId),
      getUserReviews(userId),
      getUserReviewStats(userId),
    ])
      .then(([prof, items, revs, stats]) => {
        setProfile(prof);
        setListings(items);
        setReviews(revs);
        setReviewStats(stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user) {
      getFavorites()
        .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.listingId))))
        .catch(() => {});

      // Check if current user already has a review (including pending/rejected)
      import('@/services/reviews').then(({ getMyReviews }) => {
        getMyReviews().then((myRevs) => {
          setHasMyReview(myRevs.some((r) => r.targetId === Number(id)));
        }).catch(() => {});
      });
    }
  }, [user, id]);

  const handleFavoriteChange = (listingId: number, isFav: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(listingId);
      else next.delete(listingId);
      return next;
    });
  };

  const handleSubmitReview = async () => {
    if (!formRating || !formSatisfaction.trim() || !formLiked.trim() || !formDisliked.trim()) {
      setReviewError('Заполните все обязательные поля и поставьте оценку');
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await createReview({
        targetId: Number(id),
        rating: formRating,
        satisfaction: formSatisfaction.trim(),
        liked: formLiked.trim(),
        disliked: formDisliked.trim(),
        listingId: formListingId,
      });
      setReviewSuccess(true);
      setShowReviewForm(false);
      setHasMyReview(true);
      setFormRating(0);
      setFormSatisfaction('');
      setFormLiked('');
      setFormDisliked('');
      setFormListingId(undefined);
    } catch (err: any) {
      setReviewError(err?.message || 'Ошибка при отправке отзыва');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="muted">Загрузка профиля...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="muted">Пользователь не найден</div>
      </div>
    );
  }

  const displayName = profile.name || 'Пользователь';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleChat = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push(`/chat?receiverId=${profile.id}`);
  };

  const canLeaveReview = user && String(user.id) !== String(id) && !hasMyReview && !reviewSuccess;

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .profile-listings-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>

      {/* Profile header card */}
      <div
        className="card"
        style={{
          padding: 28,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Avatar */}
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={displayName}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.9)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 24,
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: '0 4px 16px var(--brand-glow)',
            }}
          >
            {initials}
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>{displayName}</div>
          {reviewStats && reviewStats.count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Stars rating={Math.round(reviewStats.average)} size={16} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{reviewStats.average}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                ({reviewStats.count} {reviewStats.count === 1 ? 'отзыв' : reviewStats.count < 5 ? 'отзыва' : 'отзывов'})
              </span>
            </div>
          )}
          {profile.city && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              <IconMapPin size={14} strokeWidth={2} />
              {profile.city.name}
            </div>
          )}
          <div className="muted" style={{ fontSize: 13 }}>
            На сайте с{' '}
            {new Date(profile.createdAt).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {profile.phone && (
            showPhone ? (
              <a
                href={`tel:${profile.phone}`}
                className="btn primary"
                style={{ textDecoration: 'none', gap: 8, justifyContent: 'center' }}
              >
                <IconPhone size={16} strokeWidth={1.8} />
                {profile.phone}
              </a>
            ) : (
              <button
                className="btn primary"
                onClick={() => setShowPhone(true)}
                style={{ gap: 8 }}
              >
                <IconPhone size={16} strokeWidth={1.8} />
                <span style={{ letterSpacing: 0 }}>
                  {profile.phone.slice(0, 6)}
                  <span style={{ filter: 'blur(5px)', userSelect: 'none' }}>
                    {profile.phone.slice(6)}
                  </span>
                </span>
                &nbsp;Показать
              </button>
            )
          )}
          {user && String(user.id) !== String(id) && (
            <button className="btn primary" onClick={handleChat} style={{ gap: 8 }}>
              <IconMessage size={16} strokeWidth={1.8} />
              Написать
            </button>
          )}
        </div>
      </div>

      {/* Listings section */}
      <div style={{ marginBottom: 16 }}>
        <div className="h2">
          Объявления · {listings.length}
        </div>
      </div>

      {listings.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}
        >
          У пользователя пока нет активных объявлений
        </div>
      ) : (
        <div
          className="profile-listings-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={favoriteIds.has(listing.id)}
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </div>
      )}

      {/* Reviews section */}
      <div style={{ marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="h2" style={{ margin: 0 }}>
          Отзывы · {reviews.length}
        </div>
        {canLeaveReview && (
          <button
            className="btn primary"
            onClick={() => setShowReviewForm(true)}
            style={{ fontSize: 14, padding: '6px 16px' }}
          >
            Оставить отзыв
          </button>
        )}
      </div>

      {/* Review success message */}
      {reviewSuccess && (
        <div
          className="card"
          style={{ padding: 16, marginBottom: 16, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          Ваш отзыв отправлен на модерацию. После проверки он появится в профиле.
        </div>
      )}

      {/* Review form */}
      {showReviewForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Новый отзыв</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Оценка *</div>
            <ClickableStars value={formRating} onChange={setFormRating} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Удовлетворённость общением *</div>
            <textarea
              value={formSatisfaction}
              onChange={(e) => setFormSatisfaction(e.target.value)}
              className="input"
              rows={2}
              placeholder="Опишите ваш опыт общения с этим пользователем"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Что понравилось *</div>
            <textarea
              value={formLiked}
              onChange={(e) => setFormLiked(e.target.value)}
              className="input"
              rows={2}
              placeholder="Что вам понравилось?"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Что не понравилось *</div>
            <textarea
              value={formDisliked}
              onChange={(e) => setFormDisliked(e.target.value)}
              className="input"
              rows={2}
              placeholder="Что можно улучшить?"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {listings.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Связано с объявлением (необязательно)</div>
              <select
                className="input"
                value={formListingId ?? ''}
                onChange={(e) => setFormListingId(e.target.value ? Number(e.target.value) : undefined)}
                style={{ width: '100%' }}
              >
                <option value="">Не выбрано</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
          )}

          {reviewError && (
            <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{reviewError}</div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn primary"
              onClick={handleSubmitReview}
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
            <button
              className="btn"
              onClick={() => setShowReviewForm(false)}
              disabled={reviewSubmitting}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 && !reviewSuccess ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}
        >
          Пока нет отзывов
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((review) => (
            <div key={review.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                {review.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.author.avatarUrl}
                    alt={review.author.name || ''}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {(review.author.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <Link
                    href={`/profile/${review.author.id}`}
                    style={{ fontWeight: 600, fontSize: 14, textDecoration: 'none', color: 'inherit' }}
                  >
                    {review.author.name || 'Пользователь'}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                <Stars rating={review.rating} size={14} />
              </div>

              <div style={{ fontSize: 14, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Общение: </span>
                {review.satisfaction}
              </div>

              <div style={{ fontSize: 14, marginBottom: 4, color: '#22c55e' }}>
                <span style={{ fontWeight: 600 }}>Понравилось: </span>
                {review.liked}
              </div>

              <div style={{ fontSize: 14, marginBottom: 4, color: '#ef4444' }}>
                <span style={{ fontWeight: 600 }}>Не понравилось: </span>
                {review.disliked}
              </div>

              {review.listing && (
                <div style={{ marginTop: 8 }}>
                  <Link
                    href={`/listing/${review.listing.id}`}
                    style={{ fontSize: 13, color: 'var(--brand)' }}
                  >
                    Объявление: {review.listing.title}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
