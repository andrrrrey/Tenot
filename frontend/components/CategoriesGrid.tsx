"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories, type Category } from "@/services/categories";
import { IconChevronRight } from "@/components/Icons";

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 72 }} />
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 10,
      }}
    >
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/search?category=${c.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "var(--card)",
            backdropFilter: "var(--blur)",
            WebkitBackdropFilter: "var(--blur)",
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(-2px)";
            el.style.boxShadow = "var(--shadow)";
            el.style.background = "rgba(255,255,255,0.92)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "var(--shadow-sm)";
            el.style.background = "var(--card)";
          }}
        >
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.imageUrl}
              alt={c.name}
              style={{
                width: 42,
                height: 42,
                objectFit: "cover",
                borderRadius: 10,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "var(--brand-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1.3 }}>
              {c.name}
            </div>
            {c.children && c.children.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginTop: 3,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {c.children.map((s) => s.name).join(", ")}
              </div>
            )}
          </div>

          <IconChevronRight size={16} color="var(--muted-light)" strokeWidth={1.8} style={{ flexShrink: 0 }} />
        </Link>
      ))}
    </div>
  );
}
