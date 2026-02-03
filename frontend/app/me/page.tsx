"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/useMe";
import { useStore } from "@/lib/store";

export default function MeHome() {
  const router = useRouter();
  const { user, loading } = useMe();
  const storeUser = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  // Объединяем данные из API и store
  const displayUser = user || storeUser;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading) {
    return <div className="card">Загрузка...</div>;
  }

  if (!displayUser) {
    return (
      <div className="card">
        Нужен вход.{" "}
        <Link href="/login" style={{ color: "var(--brand)", fontWeight: 700 }}>
          Войти
        </Link>
      </div>
    );
  }

  const role = (user?.role || storeUser?.role) as string | undefined;
  const isBuyer = role === "BUYER";
  const isSupplier = role === "SUPPLIER";
  const isAdmin = role === "ADMIN";

  const roleLabel = {
    BUYER: "Покупатель",
    SUPPLIER: "Поставщик",
    ADMIN: "Администратор",
  }[role || ""] || "Пользователь";

  return (
    <div className="grid">
      <section style={{ gridColumn: "span 8" }}>
        <div className="card">
          <div className="h2">Личный кабинет</div>

          <div style={{ marginTop: 8 }}>
            <span className="muted">Роль: </span>
            <strong>{roleLabel}</strong>
          </div>

          <div className="row" style={{ flexWrap: "wrap", marginTop: 16, gap: 10 }}>
            {/* Для поставщиков и админов */}
            {(isSupplier || isAdmin) && (
              <>
                <Link className="btn primary" href="/me/items">
                  Мои объявления
                </Link>
                <Link className="btn primary" href="/add">
                  Разместить объявление
                </Link>
              </>
            )}

            {/* Для покупателей */}
            {isBuyer && (
              <Link className="btn primary" href="/me/fav">
                Избранное
              </Link>
            )}

            {/* Общие для всех */}
            <Link className="btn" href="/me/settings">
              Настройки
            </Link>
            <Link className="btn" href="/chat">
              Мои чаты
            </Link>

            <button className="btn" type="button" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>
      </section>

      <aside style={{ gridColumn: "span 4" }}>
        <div className="card" style={{ background: "var(--soft)" }}>
          <div className="h2">Быстрые действия</div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Link className="btn" href="/search">
              Поиск объявлений
            </Link>

            {isAdmin && (
              <Link className="btn" href="/admin">
                Панель администратора
              </Link>
            )}

            {isSupplier && (
              <Link className="btn" href="/supplier">
                Кабинет поставщика
              </Link>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
