"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getMyListings, deleteListing, createListing, getCoverUrl, type Listing } from "@/services/listings";
import { api } from "@/lib/api";

export default function DraftsPage() {
  const { user, loading: authLoading } = useRequireRole(["USER", "ADMIN"]);
  const [drafts, setDrafts] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMyListings()
      .then((data) => {
        setDrafts(
          data
            .filter((l) => l.status === "DRAFT")
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      })
      .catch((e) => setError(e.message || "Ошибка загрузки черновиков"))
      .finally(() => setLoading(false));
  }, [user]);

  const handlePublish = async (id: number) => {
    if (!confirm("Опубликовать этот черновик?")) return;
    try {
      await api.patch(`/listings/${id}`, { status: "PUBLISHED" });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      alert(e.message || "Ошибка при публикации");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот черновик? Это действие необратимо.")) return;
    try {
      await deleteListing(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      alert(e.message || "Ошибка при удалении");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div className="muted">Загрузка...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link className="btn ghost" href="/me" style={{ padding: "8px 12px" }}>← Профиль</Link>
        <h1 className="h2" style={{ margin: 0 }}>Черновики</h1>
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>{drafts.length} шт.</span>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      {drafts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📝</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Черновиков нет</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>Сохраняйте незаконченные объявления как черновики</div>
          <Link className="btn primary" href="/add">Создать объявление</Link>
        </div>
      ) : (
        <>
          <style>{`
            .drafts-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
            @media (max-width: 900px) { .drafts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
            @media (max-width: 640px) { .drafts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
            @media (max-width: 360px) { .drafts-grid { grid-template-columns: 1fr; } }
          `}</style>
          <div className="drafts-grid">
            {drafts.map((draft) => {
              const coverUrl = getCoverUrl(draft.images);
              return (
                <div
                  key={draft.id}
                  className="card"
                  style={{ overflow: "hidden", display: "flex", flexDirection: "column", padding: 0, opacity: 0.9 }}
                >
                  <div style={{ position: "relative", width: "100%", paddingTop: "60%", background: "linear-gradient(135deg,#f0f2f8,#e8ebf4)", flexShrink: 0 }}>
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverUrl} alt={draft.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,0.18)" }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                    <div style={{ position: "absolute", top: 8, left: 8, background: "#f59e0b", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4 }}>
                      Черновик
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4, color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {draft.title}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--price)" }}>
                      {draft.price > 0 ? `${draft.price.toLocaleString("ru-RU")} ₽` : "Цена не указана"}
                    </div>
                    <div style={{ color: "var(--muted-light)", fontSize: 11 }}>
                      {new Date(draft.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </div>
                  </div>

                  <div style={{ padding: "0 14px 14px", display: "flex", gap: 8 }}>
                    <Link
                      className="btn"
                      href={`/edit/${draft.id}`}
                      style={{ flex: 1, fontSize: 12, padding: "8px 10px", textAlign: "center" }}
                    >
                      Изменить
                    </Link>
                    <button
                      className="btn primary"
                      onClick={() => handlePublish(draft.id)}
                      style={{ flex: 1, fontSize: 12, padding: "8px 10px" }}
                    >
                      Опубликовать
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => handleDelete(draft.id)}
                      style={{ fontSize: 12, padding: "8px 10px" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
