'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPublicProfile, type PublicUserProfile } from '@/services/users';
import { getUserListings, type Listing } from '@/services/listings';
import { getFavorites } from '@/services/favorites';
import { ListingCard } from '@/components/ListingCard';
import { useMe } from '@/hooks/useMe';
import { IconPhone, IconMessage, IconMapPin } from '@/components/Icons';
import { openChatForListing } from '@/components/ChatWidget';

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useMe();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    const userId = Number(id);
    Promise.all([
      getPublicProfile(userId),
      getUserListings(userId),
    ])
      .then(([prof, items]) => {
        setProfile(prof);
        setListings(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user) {
      getFavorites()
        .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.listingId))))
        .catch(() => {});
    }
  }, [user]);

  const handleFavoriteChange = (listingId: number, isFav: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(listingId);
      else next.delete(listingId);
      return next;
    });
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
    // Navigate to chat page with this user (no specific listing)
    router.push(`/chat?receiverId=${profile.id}`);
  };

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
    </div>
  );
}
