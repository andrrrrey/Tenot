"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getFavorites, removeFavorite, type Favorite } from "@/services/favorites";
import { ListingCard } from "@/components/ListingCard";

export default function FavPage() {
  const { user, loading: authLoading } = useRequireRole(["BUYER"]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getFavorites()
      .then((data) => {
        // Сортируем по дате добавления (id по возрастанию = старые сначала, поэтому reverse)
        setFavorites(data.sort((a, b) => b.id - a.id));
      })
      .catch((e) => {
        setError(e.message || "Ошибка загрузки избранного");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleFavoriteChange = async (listingId: number, isFav: boolean) => {
    if (!isFav) {
      // Удаляем из локального списка
      setFavorites((prev) => prev.filter((f) => f.listingId !== listingId));
    }
  };

  if (authLoading) {
    return <div className="card">Загрузка...</div>;
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h2">Избранное</h1>
        <Link className="btn" href="/search">
          К поиску
        </Link>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 12, color: "red" }}>
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 16,
        }}
      >
        {loading ? (
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            Загрузка избранного...
          </div>
        ) : (
          <>
            {favorites.map((f) => (
              <ListingCard
                key={f.id}
                listing={f.listing}
                isFavorite={true}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}

            {favorites.length === 0 && (
              <div className="card" style={{ gridColumn: "1 / -1" }}>
                Пока пусто. Откройте{" "}
                <Link href="/search" style={{ color: "var(--brand)", fontWeight: 700 }}>
                  поиск
                </Link>{" "}
                и добавьте объявления в избранное.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
