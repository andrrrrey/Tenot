"use client";

import { useEffect, useState } from "react";
import { getListings, type Listing } from "@/services/listings";
import { getFavorites } from "@/services/favorites";
import { ListingCard } from "@/components/ListingCard";
import { useMe } from "@/hooks/useMe";

export function FreshList() {
  const { user } = useMe();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getListings()
      .then((data) => {
        const sorted = data
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);
        setListings(sorted);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

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
      <div className="fresh-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
        ))}
        <style>{`
          .fresh-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }
          @media (max-width: 900px) {
            .fresh-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          `}</style>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--muted)",
        }}
      >
        Пока нет объявлений. Станьте первым!
      </div>
    );
  }

  return (
    <>
      <div className="fresh-grid">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            isFavorite={favoriteIds.has(listing.id)}
            onFavoriteChange={handleFavoriteChange}
          />
        ))}
      </div>
      <style>{`
        .fresh-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 900px) {
          .fresh-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 500px) {
          .fresh-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </>
  );
}
