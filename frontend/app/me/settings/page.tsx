"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { user: apiUser, loading } = useMe();
  const storeUser = useStore((s) => s.user);
  const updateProfile = useStore((s) => s.updateProfile);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [saved, setSaved] = useState(false);

  // Инициализируем поля при загрузке
  useEffect(() => {
    if (storeUser) {
      setName(storeUser.name || "");
      setCity(storeUser.city || "");
    }
  }, [storeUser]);

  // Редирект на логин если не авторизован
  useEffect(() => {
    if (!loading && !apiUser) {
      router.push("/login");
    }
  }, [loading, apiUser, router]);

  const handleSave = () => {
    updateProfile({ name, city });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return <div className="card">Загрузка...</div>;
  }

  if (!apiUser) {
    return null; // Redirecting to login
  }

  const role = apiUser.role;
  const roleLabel = {
    BUYER: "Покупатель",
    SUPPLIER: "Поставщик",
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
                Город
              </div>
              <input
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ваш город"
              />
            </label>
            <button className="btn primary" onClick={handleSave}>
              Сохранить
            </button>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              Настройки отображения хранятся локально в браузере.
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
            {role === "SUPPLIER" && (
              <Link className="btn" href="/supplier">
                Профиль поставщика
              </Link>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
