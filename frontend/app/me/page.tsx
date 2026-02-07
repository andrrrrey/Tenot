"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/useMe";
import { useStore } from "@/lib/store";
import { getMyProfile, type UserProfile } from "@/services/users";
import { getMyListings, type Listing } from "@/services/listings";
import { getFavorites } from "@/services/favorites";

export default function MeHome() {
  const router = useRouter();
  const { user, loading } = useMe();
  const storeUser = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listingsCount, setListingsCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  const displayUser = user || storeUser;

  useEffect(() => {
    if (!displayUser) return;
    setProfileLoading(true);
    Promise.all([
      getMyProfile().catch(() => null),
      getMyListings().catch(() => []),
      getFavorites().catch(() => []),
    ]).then(([prof, listings, favs]) => {
      if (prof) setProfile(prof);
      setListingsCount(listings.length);
      setFavCount(favs.length);
      setProfileLoading(false);
    });
  }, [displayUser]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading) {
    return <div className="card">Загрузка...</div>;
  }

  if (!displayUser) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
        <div className="h2">Требуется авторизация</div>
        <p className="muted" style={{ marginTop: 8 }}>
          Войдите в аккаунт, чтобы получить доступ к личному кабинету
        </p>
        <Link
          className="btn primary"
          href="/login"
          style={{ marginTop: 16 }}
        >
          Войти
        </Link>
      </div>
    );
  }

  const role = (user?.role || storeUser?.role) as string | undefined;
  const isAdmin = role === "ADMIN";
  const roleLabel =
    { USER: "Пользователь", ADMIN: "Администратор" }[role || ""] ||
    "Пользователь";

  const displayName = profile?.name || profile?.email || "Пользователь";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
      })
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Profile header card */}
      <div
        className="card"
        style={{
          overflow: "hidden",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "var(--brand)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 28,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {profileLoading ? "..." : initials}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div className="h2">
                {profileLoading ? "Загрузка..." : displayName}
              </div>
              <div
                className="muted"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="badge"
                  style={{
                    background: isAdmin ? "#fef3c7" : "var(--soft)",
                    color: isAdmin ? "#92400e" : "var(--muted)",
                    borderColor: isAdmin ? "#fde68a" : "var(--line)",
                  }}
                >
                  {roleLabel}
                </span>
                {memberSince && (
                  <span style={{ fontSize: 12 }}>
                    На сайте с {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact info */}
          {!profileLoading && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              {profile?.email && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    &#9993;
                  </span>
                  <span style={{ fontSize: 14 }}>{profile.email}</span>
                </div>
              )}
              {profile?.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    &#9742;
                  </span>
                  <span style={{ fontSize: 14 }}>{profile.phone}</span>
                </div>
              )}
              {!profile?.phone && (
                <Link
                  href="/me/settings"
                  style={{
                    fontSize: 13,
                    color: "var(--brand)",
                    fontWeight: 600,
                  }}
                >
                  + Добавить телефон
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid">
        <div
          className="card"
          style={{
            gridColumn: "span 6",
            textAlign: "center",
            padding: 20,
          }}
        >
          <div
            style={{ fontSize: 32, fontWeight: 800, color: "var(--brand)" }}
          >
            {profileLoading ? "—" : listingsCount}
          </div>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Объявлений
          </div>
        </div>
        <div
          className="card"
          style={{
            gridColumn: "span 6",
            textAlign: "center",
            padding: 20,
          }}
        >
          <div
            style={{ fontSize: 32, fontWeight: 800, color: "#ef4444" }}
          >
            {profileLoading ? "—" : favCount}
          </div>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            В избранном
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid">
        <section style={{ gridColumn: "span 8" }}>
          <div className="card">
            <div className="h2" style={{ marginBottom: 14 }}>
              Управление
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              <Link
                className="btn primary"
                href="/me/items"
                style={{ justifyContent: "flex-start", padding: "14px 16px" }}
              >
                &#128196;&ensp;Мои объявления
              </Link>
              <Link
                className="btn primary"
                href="/add"
                style={{ justifyContent: "flex-start", padding: "14px 16px" }}
              >
                &#10133;&ensp;Разместить объявление
              </Link>
              <Link
                className="btn primary"
                href="/me/fav"
                style={{ justifyContent: "flex-start", padding: "14px 16px" }}
              >
                &#9829;&ensp;Избранное
              </Link>
              <Link
                className="btn"
                href="/chat"
                style={{ justifyContent: "flex-start", padding: "14px 16px" }}
              >
                &#128172;&ensp;Мои чаты
              </Link>
              <Link
                className="btn"
                href="/me/settings"
                style={{ justifyContent: "flex-start", padding: "14px 16px" }}
              >
                &#9881;&ensp;Настройки профиля
              </Link>
              <Link
                className="btn"
                href="/search"
                style={{ justifyContent: "flex-start", padding: "14px 16px" }}
              >
                &#128269;&ensp;Поиск объявлений
              </Link>
            </div>
          </div>
        </section>

        <aside style={{ gridColumn: "span 4" }}>
          <div
            className="card"
            style={{
              background: "var(--soft)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div className="h2">Быстрые действия</div>

            {isAdmin && (
              <Link
                className="btn"
                href="/admin"
                style={{
                  background: "#fef3c7",
                  borderColor: "#fde68a",
                  color: "#92400e",
                  fontWeight: 700,
                }}
              >
                &#128737;&ensp;Панель администратора
              </Link>
            )}

            <button
              className="btn"
              type="button"
              onClick={handleLogout}
              style={{ color: "#ef4444", borderColor: "#fecaca" }}
            >
              Выйти из аккаунта
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
