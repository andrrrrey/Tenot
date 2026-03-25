'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getListing, type Listing } from '@/services/listings';
import { useMe } from '@/hooks/useMe';
import { addFavorite, removeFavorite, getFavorites } from '@/services/favorites';
import { MediaGallery } from '@/components/MediaGallery';
import {
  IconHeart,
  IconPhone,
  IconMessage,
  IconMapPin,
  IconArrowLeft,
} from '@/components/Icons';
import { openChatForListing } from '@/components/ChatWidget';

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useMe();
  const [listing, setListing] = useState<Listing | null>(null);
  const [fav, setFav] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    getListing(Number(id)).then(setListing);
  }, [id]);

  useEffect(() => {
    if (!user || !listing) return;
    getFavorites()
      .then((items) => setFav(items.some((f) => f.listingId === listing.id)))
      .catch(() => {});
  }, [user, listing]);

  if (!listing) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div className="muted">Загрузка...</div>
      </div>
    );
  }

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

  const handleChat = () => {
    if (!user) { router.push('/login'); return; }
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      router.push(`/chat?listingId=${listing.id}&receiverId=${listingOwnerId}`);
    } else {
      openChatForListing(listing.id, listingOwnerId!, sellerName, listing.title);
    }
  };

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .listing-card-inner { padding: 12px !important; overflow: hidden; }
          .listing-price { font-size: 22px !important; }
          .listing-aside { display: none !important; }
          .listing-main { padding-bottom: 130px; max-width: 100%; overflow: hidden; }
          .listing-back-btn { padding: 6px 10px !important; font-size: 12px !important; margin-bottom: 10px !important; }
        }
        .listing-mobile-bar { display: none; }
        @media (max-width: 768px) {
          .listing-mobile-bar {
            display: flex;
            position: fixed;
            bottom: var(--mobile-nav-height, 60px);
            left: 0;
            right: 0;
            padding: 10px 16px;
            gap: 10px;
            background: rgba(242, 244, 248, 0.92);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-top: 1px solid rgba(255, 255, 255, 0.72);
            box-shadow: 0 -2px 12px rgba(0,0,0,0.07);
            z-index: 150;
          }
        }
      `}</style>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="btn listing-back-btn"
        style={{
          marginBottom: 20,
          gap: 8,
          padding: "8px 14px",
          fontSize: 13,
        }}
      >
        <IconArrowLeft size={15} strokeWidth={2} />
        Назад
      </button>

      <div className="grid">
        {/* Main content */}
        <div className="listing-main" style={{ gridColumn: 'span 8' }}>
          <div className="card listing-card-inner" style={{ padding: '20px' }}>
            {/* Media gallery */}
            <MediaGallery media={listing.images ?? []} />

            {/* Title & meta */}
            <div style={{ marginTop: 20 }}>
              <h1 className="h2" style={{ marginBottom: 6 }}>{listing.title}</h1>

              {(listing.category?.name || listing.city?.name) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginTop: 8,
                  }}
                >
                  {listing.city?.name && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 13,
                        color: 'var(--muted)',
                        fontWeight: 500,
                        background: 'rgba(0,0,0,0.04)',
                        padding: '4px 10px',
                        borderRadius: 999,
                      }}
                    >
                      <IconMapPin size={12} strokeWidth={2} />
                      {listing.city.name}
                    </span>
                  )}
                  {listing.category?.name && (
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--muted)',
                        fontWeight: 500,
                        background: 'rgba(0,0,0,0.04)',
                        padding: '4px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {listing.category.name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Price */}
            <div
              className="listing-price"
              style={{
                marginTop: 20,
                fontSize: 32,
                fontWeight: 800,
                color: 'var(--brand)',
                letterSpacing: '-0.03em',
              }}
            >
              {listing.price.toLocaleString('ru-RU')} ₽
            </div>

            {/* Favorite */}
            {user && (
              <div style={{ marginTop: 14 }}>
                <button
                  className="btn"
                  onClick={toggleFav}
                  style={{
                    borderColor: fav ? 'rgba(239,68,68,0.3)' : undefined,
                    color: fav ? '#ef4444' : undefined,
                    background: fav ? 'rgba(239,68,68,0.06)' : undefined,
                    gap: 8,
                  }}
                >
                  <IconHeart size={16} filled={fav} color={fav ? '#ef4444' : 'currentColor'} strokeWidth={2} />
                  {fav ? 'Убрать из избранного' : 'В избранное'}
                </button>
              </div>
            )}

            <hr style={{ margin: '20px 0' }} />

            {/* Description */}
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  marginBottom: 12,
                  color: 'var(--text)',
                }}
              >
                Описание
              </div>
              <p
                style={{
                  margin: 0,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  fontSize: 14,
                  color: 'var(--muted)',
                }}
              >
                {listing.description}
              </p>
            </div>

            <div
              className="muted"
              style={{ marginTop: 20, fontSize: 12, paddingTop: 16, borderTop: '1px solid var(--line-solid)' }}
            >
              Опубликовано:{' '}
              {new Date(listing.createdAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Seller sidebar */}
        <aside className="listing-aside" style={{ gridColumn: 'span 4' }}>
          <div
            className="card"
            style={{
              position: 'sticky',
              top: 80,
              padding: '22px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>Продавец</div>

            {/* Avatar + name */}
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
                    border: '2px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    flexShrink: 0,
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
                    boxShadow: '0 4px 12px var(--brand-glow)',
                  }}
                >
                  {sellerInitials}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{sellerName}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Продавец</div>
              </div>
            </div>

            {/* Phone */}
            {sellerPhone && (
              showPhone ? (
                <a
                  href={`tel:${sellerPhone}`}
                  className="btn primary"
                  style={{ textDecoration: 'none', gap: 8, justifyContent: 'center' }}
                >
                  <IconPhone size={16} strokeWidth={1.8} />
                  {sellerPhone}
                </a>
              ) : (
                <button
                  className="btn primary"
                  onClick={() => setShowPhone(true)}
                  style={{ gap: 8 }}
                >
                  <IconPhone size={16} strokeWidth={1.8} />
                  <span style={{ letterSpacing: 0 }}>
                    {sellerPhone.slice(0, 6)}
                    <span style={{ filter: 'blur(5px)', userSelect: 'none' }}>
                      {sellerPhone.slice(6)}
                    </span>
                  </span>
                  &nbsp;Показать
                </button>
              )
            )}

            {/* Chat */}
            {(!user || user.id !== listingOwnerId) && (
              <button
                className="btn primary"
                onClick={handleChat}
                style={{ gap: 8 }}
              >
                <IconMessage size={16} strokeWidth={1.8} />
                Написать в чат
              </button>
            )}

            {user && user.id === listingOwnerId && (
              <Link
                className="btn"
                href={`/edit/${listing.id}`}
                style={{ gap: 8, justifyContent: 'center' }}
              >
                Редактировать объявление
              </Link>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky action bar (shown above bottom nav on mobile) */}
      {(!user || user.id !== listingOwnerId) && (
        <div className="listing-mobile-bar">
          {sellerPhone && (
            <a
              href={`tel:${sellerPhone}`}
              className="btn primary"
              style={{ flex: 1, textDecoration: 'none', gap: 8, justifyContent: 'center' }}
            >
              <IconPhone size={16} strokeWidth={1.8} />
              Позвонить
            </a>
          )}
          <button
            className="btn primary"
            onClick={handleChat}
            style={{ flex: 1, gap: 8 }}
          >
            <IconMessage size={16} strokeWidth={1.8} />
            Написать
          </button>
        </div>
      )}
    </div>
  );
}
