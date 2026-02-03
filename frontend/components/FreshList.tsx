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

  // Загрузка свежих объявлений
  useEffect(() => {
    setLoading(true);
    getListings()
      .then((data) => {
        // Сортируем по дате и берём 6 последних
        const sorted = data
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 6);
        setListings(sorted);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  // Загрузка избранного для покупателя
  useEffect(() => {
    if (user?.role === "BUYER") {
      getFavorites()
        .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.listingId))))
        .catch(() => {});
    }
  }, [user]);

  const handleFavoriteChange = (listingId: number, isFav: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) {
        next.add(listingId);
      } else {
        next.delete(listingId);
      }
      return next;
    });
  };

  if (loading) {
    return <div className="card">Загрузка объявлений...</div>;
  }

  if (listings.length === 0) {
    return <div className="card">Пока нет объявлений.</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
  );
}
