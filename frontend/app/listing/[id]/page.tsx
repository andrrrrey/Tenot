'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getListing, type Listing } from '@/services/listings';
import { useMe } from '@/hooks/useMe';
import { addFavorite, removeFavorite, getFavorites } from '@/services/favorites';

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useMe();
  const [listing, setListing] = useState<Listing | null>(null);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    getListing(Number(id)).then(setListing);
  }, [id]);

  useEffect(() => {
    if (!user || !listing) return;
    getFavorites()
      .then((items) => setFav(items.some((f) => f.listingId === listing.id)))
      .catch(() => {});
  }, [user, listing]);

  if (!listing) return <div className="card">Загрузка...</div>;

  const listingOwnerId = listing.user?.id;
  const sellerName = listing.user?.name || 'Продавец';
  const sellerPhone = listing.user?.phone;
  const sellerInitials = sellerName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const toggleFav = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (fav) {
      await removeFavorite(listing.id);
      setFav(false);
    } else {
      await addFavorite(listing.id);
      setFav(true);
    }
  };

  return (
    <div className="grid">
      {/* Main content */}
      <div style={{ gridColumn: 'span 8' }}>
        <div className="card" style={{ padding: 20 }}>
          {/* Images */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {listing.images?.length ? (
              listing.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  style={{
                    width: listing.images.length === 1 ? '100%' : 280,
                    maxHeight: 320,
                    objectFit: 'cover',
                    borderRadius: 12,
                  }}
                />
              ))
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 200,
                  background: 'var(--soft)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="muted">Нет фото</span>
              </div>
            )}
          </div>

          {/* Title & price */}
          <div style={{ marginTop: 16 }}>
            <h1 className="h2" style={{ marginBottom: 4 }}>{listing.title}</h1>
            {(listing.category?.name || listing.city?.name) && (
              <div className="muted" style={{ fontSize: 13 }}>
                {listing.category?.name}
                {listing.category?.name && listing.city?.name && ' \u00B7 '}
                {listing.city?.name}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--brand)',
            }}
          >
            {listing.price.toLocaleString('ru-RU')} ₽
          </div>

          {/* Favorite button */}
          {user && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={toggleFav}
                style={{
                  borderColor: fav ? '#fecaca' : undefined,
                  color: fav ? '#ef4444' : undefined,
                }}
              >
                {fav ? '♥ Убрать из избранного' : '♡ В избранное'}
              </button>
            </div>
          )}

          {/* Description */}
          <hr style={{ margin: '16px 0' }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Описание</div>
            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {listing.description}
            </p>
          </div>

          <div className="muted" style={{ marginTop: 16, fontSize: 12 }}>
            Опубликовано: {new Date(listing.createdAt).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Seller sidebar */}
      <aside style={{ gridColumn: 'span 4' }}>
        <div
          className="card"
          style={{
            position: 'sticky',
            top: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16 }}>Продавец</div>

          {/* Seller avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {listing.user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.user.avatarUrl}
                alt={sellerName}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '2px solid var(--brand)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {sellerInitials}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{sellerName}</div>
            </div>
          </div>

          {/* Phone number */}
          {sellerPhone && (
            <a
              href={`tel:${sellerPhone}`}
              className="btn primary"
              style={{ textDecoration: 'none' }}
            >
              &#9742;&ensp;{sellerPhone}
            </a>
          )}

          {/* Chat button — only for non-owners */}
          {(!user || user.id !== listingOwnerId) && (
            <button
              className="btn primary"
              onClick={() => {
                if (!user) {
                  router.push('/login');
                  return;
                }
                router.push(`/chat?listingId=${listing.id}&receiverId=${listingOwnerId}`);
              }}
            >
              &#128172;&ensp;Написать в чат
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
