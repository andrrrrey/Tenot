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
    return <div className="card">Загрузка категорий...</div>;
  }

  if (categories.length === 0) {
    return <div className="card muted">Категории не найдены</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3,minmax(0,1fr))",
        gap: 12,
      }}
    >
      {categories.map((c) => (
        <Link
          key={c.id}
          className="card"
          href={`/search?category=${c.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {c.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.imageUrl}
                alt={c.name}
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "cover",
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              />
            )}
            <div>
              <div style={{ fontWeight: 800 }}>{c.name}</div>
              {c.children && c.children.length > 0 && (
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {c.children.map((s) => s.name).join(", ")}
                </div>
              )}
            </div>
          </div>
          <span className="badge">→</span>
        </Link>
      ))}
    </div>
  );
}
