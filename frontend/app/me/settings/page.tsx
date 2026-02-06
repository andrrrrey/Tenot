"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile } from "@/services/profile";

export default function SettingsPage() {
  const router = useRouter();
  const { user: apiUser, loading } = useMe();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !apiUser) {
      router.push("/login");
    }
  }, [loading, apiUser, router]);

  useEffect(() => {
    if (apiUser) {
      getProfile()
        .then((profile) => {
          setName(profile.name || "");
          setPhone(profile.phone || "");
        })
        .catch(() => {});
    }
  }, [apiUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Ошибка сохранения профиля");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card">Загрузка...</div>;
  }

  if (!apiUser) {
    return null;
  }

  const role = apiUser.role;
  const roleLabel = {
    USER: "Пользователь",
    ADMIN: "Администратор",
  }[role] || "Пользователь";

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

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
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
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Телефон
              </div>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </label>
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
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
