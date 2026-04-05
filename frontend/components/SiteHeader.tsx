"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { CitySearchPopup } from "@/components/CitySearchPopup";
import { subscribeUnreadCount } from "@/components/ChatWidget";
import { IconSearch, IconMessage, IconUser, IconPlus } from "@/components/Icons";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useStore();
  const [q, setQ] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [cityName, setCityName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    return subscribeUnreadCount(setUnreadCount);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cityId) params.set("cityId", cityId);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(248, 249, 251, 0.82)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.7)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}
    >
      <div className="container">
        {/* Desktop layout */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            height: 60,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--brand)",
              fontSize: 20,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            TENOT
          </Link>

          {/* Search bar — hidden on small mobile */}
          <div
            style={{
              flex: 1,
              maxWidth: 580,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
            className="header-search"
          >
            <div style={{ maxWidth: 150, flexShrink: 0, width: "100%" }}>
              <CitySearchPopup
                value={cityId}
                selectedName={cityName}
                onChange={(id, name) => { setCityId(id); setCityName(name); }}
                placeholder="Все города"
                compact
              />
            </div>
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск объявлений..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                style={{ paddingRight: 44 }}
              />
              <button
                onClick={handleSearch}
                style={{
                  position: "absolute",
                  right: 6,
                  background: "var(--brand)",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <IconSearch size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* Right actions — hidden on mobile (bottom nav handles navigation) */}
          <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {user && (
              <Link
                href="/chat"
                title="Сообщения"
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  background: "var(--card)",
                  backdropFilter: "var(--blur-sm)",
                  WebkitBackdropFilter: "var(--blur-sm)",
                  color: "var(--muted)",
                  boxShadow: "var(--shadow-xs)",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                <IconMessage size={18} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      minWidth: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "2px solid #F8F9FB",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              className="btn primary"
              href="/add"
              style={{ gap: 6, paddingLeft: 12, paddingRight: 14 }}
            >
              <IconPlus size={15} strokeWidth={2.5} />
              <span className="btn-text-hide">Разместить</span>
            </Link>

            <Link
              className="btn"
              href={user ? "/me" : "/login"}
              style={{ gap: 6, paddingLeft: user?.avatarUrl ? 6 : 12, paddingRight: 14 }}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt="Профиль"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <IconUser size={16} strokeWidth={1.8} />
              )}
              <span className="btn-text-hide">{user ? "Профиль" : "Войти"}</span>
            </Link>
          </div>
        </div>

        {/* Mobile search row */}
        <div className="header-search-mobile">
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              paddingBottom: 10,
            }}
          >
            <div style={{ maxWidth: 130, flexShrink: 0, width: "100%" }}>
              <CitySearchPopup
                value={cityId}
                selectedName={cityName}
                onChange={(id, name) => { setCityId(id); setCityName(name); }}
                placeholder="Все города"
                compact
              />
            </div>
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                style={{ paddingRight: 44 }}
              />
              <button
                onClick={handleSearch}
                style={{
                  position: "absolute",
                  right: 6,
                  background: "var(--brand)",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <IconSearch size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .header-search { display: flex !important; }
        .header-search-mobile { display: none !important; }
        .btn-text-hide { display: inline; }
        .header-actions { display: flex !important; }

        @media (max-width: 768px) {
          .header-actions { display: none !important; }
        }

        @media (max-width: 640px) {
          .header-search { display: none !important; }
          .header-search-mobile { display: block !important; }
          .btn-text-hide { display: none; }
        }
      `}</style>
    </header>
  );
}
