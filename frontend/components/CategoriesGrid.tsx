"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories, type Category } from "@/services/categories";

export function CategoriesGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="categories-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 90 }} />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="card" style={{ color: "var(--muted)", textAlign: "center", padding: 32 }}>
        Категории не найдены
      </div>
    );
  }

  return (
    <>
    <style>{`
      @media (max-width: 900px) {
        .categories-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
      }
      @media (max-width: 640px) {
        .categories-grid {
          display: flex !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: none !important;
          padding-bottom: 4px !important;
          gap: 10px !important;
        }
        .categories-grid::-webkit-scrollbar { display: none; }
        .categories-grid > * {
          flex-shrink: 0 !important;
          width: 150px !important;
        }
      }
    `}</style>
    <div
      className="categories-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/search?category=${c.id}`}
          className="cat-card"
          style={{
            display: "block",
            position: "relative",
            overflow: "hidden",
            padding: "16px 16px 16px 16px",
            minHeight: 90,
            background: "var(--card-solid)",
            border: "1px solid var(--line-solid)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xs)",
            textDecoration: "none",
            color: "inherit",
            transition: "box-shadow 0.2s, transform 0.2s",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text)",
              lineHeight: 1.3,
              maxWidth: "65%",
            }}
          >
            {c.name}
          </div>

          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.imageUrl}
              alt={c.name}
              style={{
                position: "absolute",
                bottom: -6,
                right: -6,
                width: 72,
                height: 72,
                objectFit: "cover",
                borderRadius: 12,
                opacity: 0.95,
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 64,
                height: 64,
                borderRadius: 12,
                background: "var(--brand-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.7,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
          )}
        </Link>
      ))}
    </div>
    </>
  );
}
