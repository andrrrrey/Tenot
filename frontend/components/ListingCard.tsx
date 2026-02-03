"use client";

import Link from "next/link";
import type { Listing } from "@/services/listings";
import { useStore } from "@/lib/store";
import { useMe } from "@/hooks/useMe";
import { addFavorite, removeFavorite } from "@/services/favorites";
import { useState } from "react";

type Props = {
  listing: Listing;
  isFavorite?: boolean;
  onFavoriteChange?: (listingId: number, isFav: boolean) => void;
};

export function ListingCard({ listing, isFavorite = false, onFavoriteChange }: Props) {
  const { user } = useMe();
  const storeUser = useStore((s) => s.user);
  const currentUser = user || storeUser;
  const [fav, setFav] = useState(isFavorite);
  const [loading, setLoading] = useState(false);

  const handleToggleFav = async () => {
    if (!currentUser || currentUser.role !== "BUYER") return;
    setLoading(true);
    try {
      if (fav) {
        await removeFavorite(listing.id);
        setFav(false);
        onFavoriteChange?.(listing.id, false);
      } else {
        await addFavorite(listing.id);
        setFav(true);
        onFavoriteChange?.(listing.id, true);
      }
    } catch (e) {
      console.error("Ошибка изменения избранного:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Link href={`/listing/${listing.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        {listing.images?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[0].url}
            alt={listing.title}
            style={{
              width: "100%",
              height: 140,
              objectFit: "cover",
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
        )}
        <div className="h3" style={{ margin: 0 }}>
          {listing.title}
        </div>

        <div className="muted" style={{ marginTop: 6 }}>
          {listing.category?.name || "Без категории"} • Артикул: {listing.article}
        </div>

        <div style={{ marginTop: 8, fontWeight: 800, fontSize: 18 }}>
          {listing.price.toLocaleString("ru-RU")} ₽
        </div>

        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          {new Date(listing.createdAt).toLocaleString("ru-RU")}
        </div>
      </Link>

      {currentUser?.role === "BUYER" && (
        <button
          className="btn"
          onClick={handleToggleFav}
          disabled={loading}
        >
          {loading ? "..." : fav ? "Убрать из избранного" : "В избранное"}
        </button>
      )}
    </div>
  );
}
