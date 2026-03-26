"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getFavorites, type Favorite } from "@/services/favorites";
import { ListingCard } from "@/components/ListingCard";

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
    return <div className="card">Загрузка...</div>;
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h1 className="h2">Избранное</h1>
        <Link className="btn" href="/search">К поиску</Link>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 12, color: "red" }}>{error}</div>
      )}

      {loading ? (
        <div className="fresh-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          Пока пусто. Откройте{" "}
          <Link href="/search" style={{ color: "var(--brand)", fontWeight: 700 }}>поиск</Link>
          {" "}и добавьте объявления в избранное.
        </div>
      ) : (
        <div className="fresh-grid">
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
    </div>
  );
}
