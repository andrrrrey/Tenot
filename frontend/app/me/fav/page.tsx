"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getFavorites, type Favorite } from "@/services/favorites";
import { ListingCard } from "@/components/ListingCard";
import { IconHeart, IconSearch } from "@/components/Icons";

export default function FavPage() {
  const { user, loading: authLoading } = useRequireRole(["USER", "ADMIN"]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Left-align the container on desktop
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const prev = main.style.marginLeft;
    main.style.marginLeft = "0";
    return () => { main.style.marginLeft = prev; };
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getFavorites()
      .then((data) => setFavorites(data.sort((a, b) => b.id - a.id)))
      .catch((e) => setError(e.message || "Ошибка загрузки избранного"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleFavoriteChange = async (listingId: number, isFav: boolean) => {
    if (!isFav) setFavorites((prev) => prev.filter((f) => f.listingId !== listingId));
  };

  if (authLoading) {
    return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted)" }}>Загрузка...</div>;
  }

  return (
    <>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: "var(--radius-sm)",
            background: "var(--brand-light)",
            border: "1px solid rgba(94,92,248,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <IconHeart size={22} color="var(--brand)" filled />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Избранное</h1>
            {!loading && (
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                {favorites.length === 0 ? "Пока ничего нет" : `${favorites.length} объявл${favorites.length === 1 ? "ение" : favorites.length < 5 ? "ения" : "ений"}`}
              </div>
            )}
          </div>
        </div>
        <Link className="btn" href="/search" style={{ gap: 7 }}>
          <IconSearch size={14} strokeWidth={2} />
          К поиску
        </Link>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        /* Loading skeletons */
        <div className="fav-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        /* Empty state */
        <div style={{
          background: "var(--card)",
          backdropFilter: "var(--blur)",
          WebkitBackdropFilter: "var(--blur)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow)",
          padding: "72px 32px",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%",
            background: "var(--brand-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 4,
          }}>
            <IconHeart size={44} color="var(--brand)" strokeWidth={1.2} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>Список избранного пуст</div>
          <div style={{ color: "var(--muted)", fontSize: 14, maxWidth: 300, lineHeight: 1.7 }}>
            Открывайте объявления и нажимайте ❤️ — они появятся здесь
          </div>
          <Link className="btn primary" href="/search" style={{ marginTop: 8, gap: 8, padding: "12px 28px" }}>
            <IconSearch size={15} strokeWidth={2} />
            Найти объявления
          </Link>
        </div>
      ) : (
        /* Listings grid */
        <div className="fav-grid">
          {favorites.map((f) => (
            <ListingCard
              key={f.id}
              listing={f.listing}
              isFavorite={true}
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </div>
      )}

      <style>{`
        .fav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 640px) {
          .fav-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }
        @media (max-width: 360px) {
          .fav-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
