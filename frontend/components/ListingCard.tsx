"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Listing } from "@/services/listings";
import { getCoverUrl } from "@/services/listings";
import { useStore } from "@/lib/store";
import { useMe } from "@/hooks/useMe";
import { addFavorite, removeFavorite } from "@/services/favorites";
import { useState, useEffect } from "react";
import { IconHeart, IconMapPin } from "@/components/Icons";

type Props = {
  listing: Listing;
  isFavorite?: boolean;
  onFavoriteChange?: (listingId: number, isFav: boolean) => void;
};

export function ListingCard({ listing, isFavorite = false, onFavoriteChange }: Props) {
  const { user } = useMe();
  const storeUser = useStore((s) => s.user);
  const currentUser = user || storeUser;
  const router = useRouter();
  const [fav, setFav] = useState(isFavorite);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFav(isFavorite);
  }, [isFavorite]);

  const handleToggleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      router.push("/login");
      return;
    }
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

  const coverUrl = getCoverUrl(listing.images);

  return (
    <div className="listing-card"
      style={{
        background: "var(--card-solid)",
        border: "1px solid var(--line-solid)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--shadow)",
      }}
    >
      <Link href={`/listing/${listing.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Image */}
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "62%",
            background: "linear-gradient(135deg, #f0f2f8, #e8ebf4)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={listing.title}
              loading="lazy"
              decoding="async"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(0,0,0,0.18)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}

          {/* Favorite button overlay — always visible; redirects to login for guests */}
          <button
            onClick={handleToggleFav}
            disabled={loading}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              transition: "all 0.2s ease",
              color: fav ? "#ef4444" : "var(--muted)",
            }}
          >
            <IconHeart size={15} filled={fav} color={fav ? "#ef4444" : "currentColor"} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.4,
              color: "var(--text)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {listing.title}
          </div>

          {(listing.category?.name || listing.city?.name) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--muted)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {listing.city?.name && (
                <>
                  <IconMapPin size={11} strokeWidth={1.8} />
                  <span>{listing.city.name}</span>
                  {listing.category?.name && <span style={{ opacity: 0.5 }}>·</span>}
                </>
              )}
              {listing.category?.name && <span>{listing.category.name}</span>}
            </div>
          )}

          <div
            style={{
              marginTop: "auto",
              paddingTop: 8,
              fontWeight: 800,
              fontSize: 18,
              color: "var(--price)",
              letterSpacing: "-0.02em",
            }}
          >
            {listing.price.toLocaleString("ru-RU")} ₽
          </div>

          <div style={{ color: "var(--muted-light)", fontSize: 11, fontWeight: 500 }}>
            {new Date(listing.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>
      </Link>
    </div>
  );
}
