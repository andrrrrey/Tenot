"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/services/users";
import { CitySearchPopup } from "@/components/CitySearchPopup";
import { IconArrowLeft, IconSettings, IconUser, IconPhone, IconMapPin, IconCheck } from "@/components/Icons";

export default function SettingsPage() {
  const router = useRouter();
  const { user: apiUser, loading } = useMe();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [cityName, setCityName] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !apiUser) {
      router.push("/login");
    }
  }, [loading, apiUser, router]);

  useEffect(() => {
    if (!apiUser) return;
    setProfileLoading(true);
    getMyProfile()
      .then((profile) => {
        setName(profile.name || "");
        setPhone(profile.phone || "");
        setCityId(profile.cityId ? String(profile.cityId) : "");
        setCityName(profile.city?.name || "");
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [apiUser]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({
        name: name.trim(),
        phone: phone.trim(),
        cityId: cityId ? Number(cityId) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div className="muted">Загрузка...</div>
      </div>
    );
  }

  if (!apiUser) return null;

  const role = apiUser.role;
  const roleLabel = { USER: "Пользователь", ADMIN: "Администратор" }[role] || "Пользователь";

  return (
    <div className="grid">
      <section style={{ gridColumn: "span 8" }}>
        <div className="card" style={{ padding: "28px 28px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "var(--brand-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--brand)",
                flexShrink: 0,
              }}
            >
              <IconSettings size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div className="h2">Настройки профиля</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                Роль: <strong style={{ color: "var(--text)" }}>{roleLabel}</strong>
              </div>
            </div>
          </div>

          {saved && (
            <div className="alert success" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <IconCheck size={16} strokeWidth={2.2} color="#065f46" />
              Настройки сохранены
            </div>
          )}

          {error && (
            <div className="alert error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconUser size={13} strokeWidth={1.8} />
                Имя / Название
              </div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя или название"
              />
            </div>

            <div>
              <div className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconPhone size={13} strokeWidth={1.8} />
                Телефон
              </div>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                type="tel"
              />
            </div>

            <div>
              <div className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconMapPin size={13} strokeWidth={1.8} />
                Город
              </div>
              <CitySearchPopup
                value={cityId}
                selectedName={cityName}
                onChange={(id, name) => { setCityId(id); setCityName(name); }}
                placeholder="Не выбран"
              />
            </div>

            <div
              style={{
                padding: "12px 16px",
                background: "rgba(94,92,248,0.06)",
                border: "1px solid rgba(94,92,248,0.12)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              Телефон и город будут отображаться в ваших объявлениях для связи с покупателями.
            </div>

            <button
              className="btn primary"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "13px 24px", fontSize: 15, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </div>
      </section>

      <aside style={{ gridColumn: "span 4" }}>
        <div
          className="card"
          style={{
            background: "rgba(255,255,255,0.55)",
            padding: "22px 22px",
          }}
        >
          <div className="h2" style={{ marginBottom: 14 }}>Навигация</div>
          <Link
            className="btn"
            href="/me"
            style={{ justifyContent: "flex-start", gap: 8 }}
          >
            <IconArrowLeft size={16} strokeWidth={1.8} />
            Назад в кабинет
          </Link>
        </div>
      </aside>
    </div>
  );
}
