"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getMyListings, toggleListing, type Listing } from "@/services/listings";

export default function MyItemsPage() {
  const { user, loading: authLoading } = useRequireRole(["SUPPLIER", "ADMIN"]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getMyListings()
      .then((data) => {
        setListings(
          data.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      })
      .catch((e) => {
        setError(e.message || "Ошибка загрузки объявлений");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleToggle = async (id: number, currentActive: boolean) => {
    const action = currentActive ? "скрыть" : "показать";
    if (!confirm(`Вы уверены, что хотите ${action} объявление?`)) return;

    try {
      const updated = await toggleListing(id, !currentActive);
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, isActive: updated.isActive } : l))
      );
    } catch (e: any) {
      alert(e.message || "Ошибка при изменении статуса");
    }
  };

  if (authLoading) {
    return <div className="card">Загрузка...</div>;
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <h1 className="h2">Мои объявления</h1>
        <Link className="btn primary" href="/add">
          Разместить
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
            Загрузка объявлений...
          </div>
        ) : (
          <>
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="card"
                style={{
                  opacity: listing.isActive ? 1 : 0.6,
                  position: "relative",
                }}
              >
                <Link
                  href={`/listing/${listing.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {listing.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.images[0].url}
                      alt={listing.title}
                      style={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    />
                  )}
                  <div className="h3" style={{ margin: 0 }}>
                    {listing.title}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    Артикул: {listing.article}
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 800 }}>
                    {listing.price.toLocaleString("ru-RU")} ₽
                  </div>
                  <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                    {new Date(listing.createdAt).toLocaleString("ru-RU")}
                  </div>
                </Link>

                {!listing.isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      background: "#f59e0b",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    Скрыто
                  </div>
                )}

                <button
                  className="btn"
                  style={{ marginTop: 10, width: "100%" }}
                  onClick={() => handleToggle(listing.id, listing.isActive)}
                >
                  {listing.isActive ? "Скрыть" : "Показать"}
                </button>
              </div>
            ))}

            {listings.length === 0 && (
              <div className="card" style={{ gridColumn: "1 / -1" }}>
                Пока нет объявлений.{" "}
                <Link href="/add" style={{ color: "var(--brand)", fontWeight: 700 }}>
                  Разместить
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
