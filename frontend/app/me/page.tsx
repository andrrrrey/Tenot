"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/useMe";
import { useStore } from "@/lib/store";
import { getMyProfile, uploadAvatar, type UserProfile } from "@/services/users";
import { getMyListings } from "@/services/listings";
import { getFavorites } from "@/services/favorites";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import {
  IconList,
  IconPlus,
  IconHeart,
  IconMessage,
  IconSettings,
  IconSearch,
  IconLogOut,
  IconShield,
  IconMail,
  IconPhone,
  IconCamera,
  IconLock,
} from "@/components/Icons";

export default function MeHome() {
  const router = useRouter();
  const { user, loading } = useMe();
  const storeUser = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listingsCount, setListingsCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setAvatarUploading(true);
    try {
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const updated = await uploadAvatar(croppedFile);
      setProfile(updated);
    } catch {
      // ignore
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div className="muted">Загрузка...</div>
      </div>
    );
  }

  if (!displayUser) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="card"
          style={{ textAlign: "center", padding: "48px 40px", maxWidth: 400 }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: "var(--brand-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--brand)",
            }}
          >
            <IconLock size={26} strokeWidth={1.8} />
          </div>
          <div className="h2" style={{ marginBottom: 8 }}>Требуется вход</div>
          <p className="muted" style={{ marginTop: 0, marginBottom: 24, fontSize: 14 }}>
            Войдите в аккаунт, чтобы получить доступ к личному кабинету
          </p>
          <Link className="btn primary" href="/login" style={{ padding: "12px 24px" }}>
            Войти
          </Link>
        </div>
      </div>
    );
  }

  const role = (user?.role || storeUser?.role) as string | undefined;
  const isAdmin = role === "ADMIN";
  const roleLabel =
    { USER: "Пользователь", ADMIN: "Администратор" }[role || ""] || "Пользователь";

  const displayName = profile?.name || profile?.email || "Пользователь";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
      })
    : "";

  const actions = [
    { href: "/me/items", icon: <IconList size={18} strokeWidth={1.8} />, label: "Мои объявления", primary: true },
    { href: "/add", icon: <IconPlus size={18} strokeWidth={2} />, label: "Разместить объявление", primary: true },
    { href: "/me/fav", icon: <IconHeart size={18} strokeWidth={1.8} />, label: "Избранное", primary: true },
    { href: "/chat", icon: <IconMessage size={18} strokeWidth={1.8} />, label: "Мои чаты", primary: false },
    { href: "/me/settings", icon: <IconSettings size={18} strokeWidth={1.8} />, label: "Настройки", primary: false },
    { href: "/search", icon: <IconSearch size={18} strokeWidth={1.8} />, label: "Поиск", primary: false },
  ];

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Profile header */}
        <div className="card" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div
              style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}
              onClick={handleAvatarClick}
              title="Нажмите, чтобы загрузить фото"
            >
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt="Аватар"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid rgba(255,255,255,0.9)",
                    boxShadow: "0 4px 16px rgba(94,92,248,0.25)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 26,
                    fontWeight: 700,
                    boxShadow: "0 4px 16px var(--brand-glow)",
                  }}
                >
                  {profileLoading ? "..." : initials}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "2px solid rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  color: "var(--brand)",
                }}
              >
                {avatarUploading ? (
                  <span style={{ fontSize: 10 }}>...</span>
                ) : (
                  <IconCamera size={12} strokeWidth={2} />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name & info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="h2">
                {profileLoading ? "Загрузка..." : displayName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <span
                  className="badge"
                  style={
                    isAdmin
                      ? { background: "rgba(245,158,11,0.12)", color: "#b45309", borderColor: "rgba(245,158,11,0.25)" }
                      : {}
                  }
                >
                  {isAdmin && <IconShield size={11} strokeWidth={2} style={{ marginRight: 4 }} />}
                  {roleLabel}
                </span>
                {memberSince && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    На сайте с {memberSince}
                  </span>
                )}
              </div>

              {!profileLoading && (
                <div style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {profile?.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <IconMail size={13} color="var(--muted)" strokeWidth={1.6} />
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>{profile.email}</span>
                    </div>
                  )}
                  {profile?.phone ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <IconPhone size={13} color="var(--muted)" strokeWidth={1.6} />
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>{profile.phone}</span>
                    </div>
                  ) : (
                    <Link
                      href="/me/settings"
                      style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600 }}
                    >
                      + Добавить телефон
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid">
          <div
            className="card"
            style={{ gridColumn: "span 6", textAlign: "center", padding: "22px 16px" }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "var(--brand)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {profileLoading ? "—" : listingsCount}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13, fontWeight: 500 }}>
              Объявлений
            </div>
          </div>
          <div
            className="card"
            style={{ gridColumn: "span 6", textAlign: "center", padding: "22px 16px" }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#ef4444",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {profileLoading ? "—" : favCount}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13, fontWeight: 500 }}>
              В избранном
            </div>
          </div>
        </div>

        {/* Actions grid */}
        <div className="grid">
          <section style={{ gridColumn: "span 8" }}>
            <div className="card" style={{ padding: "22px 24px" }}>
              <div className="h2" style={{ marginBottom: 16 }}>Управление</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 10,
                }}
              >
                {actions.map((action) => (
                  <Link
                    key={action.href}
                    className={`btn${action.primary ? " primary" : ""}`}
                    href={action.href}
                    style={{
                      justifyContent: "flex-start",
                      padding: "13px 16px",
                      gap: 10,
                    }}
                  >
                    {action.icon}
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <aside style={{ gridColumn: "span 4" }}>
            <div
              className="card"
              style={{
                padding: "22px 24px",
                background: "rgba(255,255,255,0.55)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div className="h2" style={{ marginBottom: 4 }}>Аккаунт</div>

              {isAdmin && (
                <Link
                  className="btn"
                  href="/admin"
                  prefetch={false}
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    borderColor: "rgba(245,158,11,0.25)",
                    color: "#b45309",
                    fontWeight: 700,
                    gap: 8,
                    justifyContent: "flex-start",
                  }}
                >
                  <IconShield size={16} strokeWidth={2} />
                  Панель администратора
                </Link>
              )}

              <button
                className="btn danger"
                type="button"
                onClick={handleLogout}
                style={{ justifyContent: "flex-start", gap: 8 }}
              >
                <IconLogOut size={16} strokeWidth={1.8} />
                Выйти из аккаунта
              </button>
            </div>
          </aside>
        </div>
      </div>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
