'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  if (!listing) return <div>Загрузка...</div>;

  const listingOwnerId = listing.user?.id;

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
    <div className="card" style={{ padding: 18 }}>
      <h1 className="h2">{listing.title}</h1>
      <div className="muted">Артикул: {listing.article}</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        {listing.images?.length ? (
          listing.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt="" width={180} style={{ borderRadius: 10 }} />
          ))
        ) : (
          <div className="muted">Нет фото</div>
        )}
      </div>

      <p style={{ marginTop: 12 }}>{listing.description}</p>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="h2">{listing.price} ₽</div>
        {user ? (
          <button className="btn" onClick={toggleFav}>{fav ? 'Убрать из избранного' : 'В избранное'}</button>
        ) : null}
      </div>

      <hr style={{ margin: '16px 0' }} />

      <div>
        <div className="h2">Автор объявления</div>
        <div>{listing.user?.name || 'Без имени'}</div>
        {listing.user?.phone && (
          <div className="muted" style={{ marginTop: 4 }}>
            Тел.: {listing.user.phone}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="btn primary"
          onClick={() => {
            router.push(`/chat?listingId=${listing.id}&receiverId=${listingOwnerId}`);
          }}
        >
          Связаться с автором
        </button>
      </div>
    </div>
  );
}
