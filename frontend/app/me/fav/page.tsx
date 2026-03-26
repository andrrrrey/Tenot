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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getFavorites()
      .then((data) => {
        setFavorites(data.sort((a, b) => b.id - a.id));
      })
      .catch((e) => {
        setError(e.message || "Ошибка загрузки избранного");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleFavoriteChange = async (listingId: number, isFav: boolean) => {
    if (!isFav) {
      setFavorites((prev) => prev.filter((f) => f.listingId !== listingId));
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
        <div className="card" style={{ padding: "32px 48px", textAlign: "center", color: "var(--muted)" }}>
          Загрузка...
        </div>
      </div>
    );
  }

  const countLabel = () => {
    const n = favorites.length;
    if (n === 1) return "1 объявление";
    if (n >= 2 && n <= 4) return `${n} объявления`;
    return `${n} объявлений`;
  };

  return (
    <div>
      {/* Page header */}
      <div className="fav-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="fav-icon-box">
            <IconHeart size={22} color="var(--brand)" filled />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>Избранное</h1>
            {!loading && favorites.length > 0 && (
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
                {countLabel()}
              </div>
            )}
          </div>
        </div>
        <Link className="btn" href="/search" style={{ gap: 6, flexShrink: 0 }}>
          <IconSearch size={14} strokeWidth={2} />
          К поиску
        </Link>
      </div>

      {error && (
        <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {loading ? (
        <div className="fav-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="fav-empty">
          <div className="fav-empty-icon">
            <IconHeart size={56} color="var(--brand)" strokeWidth={1.2} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 20, color: "var(--text)" }}>
            Список избранного пуст
          </div>
          <div style={{ color: "var(--muted)", fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>
            Открывайте объявления и нажимайте на сердечко, чтобы сохранить их здесь
          </div>
          <Link className="btn primary" href="/search" style={{ gap: 8, marginTop: 8, padding: "12px 24px" }}>
            <IconSearch size={16} strokeWidth={2} />
            Найти объявления
          </Link>
        </div>
      ) : (
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
        .fav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }
        .fav-icon-box {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          background: var(--brand-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(94, 92, 248, 0.15);
        }
        .fav-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .fav-empty {
          background: var(--card);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border: 1px solid rgba(255,255,255,0.85);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow);
          padding: 64px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .fav-empty-icon {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: var(--brand-light);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        @media (max-width: 1024px) {
          .fav-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          .fav-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .fav-header { margin-bottom: 16px; }
          .fav-empty { padding: 48px 24px; }
        }
        @media (max-width: 480px) {
          .fav-grid { gap: 10px; }
        }
      `}</style>
    </div>
  );
}
