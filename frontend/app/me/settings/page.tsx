"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/services/users";
import { getCities, type City } from "@/services/cities";

export default function SettingsPage() {
  const router = useRouter();
  const { user: apiUser, loading } = useMe();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [cities, setCities] = useState<City[]>([]);
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
    getCities()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!apiUser) return;
    setProfileLoading(true);
    getMyProfile()
      .then((profile) => {
        setName(profile.name || "");
        setPhone(profile.phone || "");
        setCityId(profile.cityId ? String(profile.cityId) : "");
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
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return <div className="card">Загрузка...</div>;
  }

  if (!apiUser) {
    return null;
  }

  const role = apiUser.role;
  const roleLabel =
    { USER: "Пользователь", ADMIN: "Администратор" }[role] || "Пользователь";

  return (
    <div className="grid">
      <section style={{ gridColumn: "span 8" }}>
        <div className="card" style={{ maxWidth: 680 }}>
          <div className="h2">Настройки профиля</div>

          <div style={{ marginTop: 12, marginBottom: 16 }}>
            <span className="muted">Роль: </span>
            <strong>{roleLabel}</strong>
          </div>

          {saved && (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                background: "#d1fae5",
                color: "#065f46",
                borderRadius: 6,
              }}
            >
              Настройки сохранены
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label>
              <div
                className="muted"
                style={{ fontSize: 12, marginBottom: 6 }}
              >
                Имя / Название
              </div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
              />
            </label>
            <label>
              <div
                className="muted"
                style={{ fontSize: 12, marginBottom: 6 }}
              >
                Телефон
              </div>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                type="tel"
              />
            </label>
            <label>
              <div
                className="muted"
                style={{ fontSize: 12, marginBottom: 6 }}
              >
                Город
              </div>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                style={{ padding: "10px 14px" }}
              >
                <option value="">Не выбран</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              Телефон и город будут отображаться в ваших объявлениях.
            </p>
          </div>
        </div>
      </section>

      <aside style={{ gridColumn: "span 4" }}>
        <div className="card" style={{ background: "var(--soft)" }}>
          <div className="h2">Навигация</div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Link className="btn" href="/me">
              Назад в кабинет
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
