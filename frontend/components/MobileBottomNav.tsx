"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { subscribeUnreadCount } from "@/components/ChatWidget";
import { IconHome, IconMessage, IconPlus, IconUser } from "@/components/Icons";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    return subscribeUnreadCount(setUnreadCount);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <style>{`
        .mobile-bottom-nav { display: none; }
        @media (max-width: 768px) {
          .mobile-bottom-nav { display: flex; }
        }
      `}</style>
      <nav
        className="mobile-bottom-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: "rgba(242, 244, 248, 0.78)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          borderTop: "1px solid rgba(255, 255, 255, 0.72)",
          boxShadow: "0 -1px 0 rgba(0,0,0,0.06), 0 -8px 24px rgba(0,0,0,0.04)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          alignItems: "stretch",
          justifyContent: "space-around",
        }}
      >
        {/* Главная */}
        <Link
          href="/"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: "10px 4px 8px",
            color: isActive("/") ? "var(--brand)" : "var(--muted)",
            textDecoration: "none",
            minHeight: 56,
          }}
        >
          <IconHome
            size={22}
            strokeWidth={isActive("/") ? 2.2 : 1.8}
            color={isActive("/") ? "var(--brand)" : "var(--muted)"}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: isActive("/") ? 600 : 500,
              letterSpacing: 0.1,
            }}
          >
            Главная
          </span>
        </Link>

        {/* Чаты */}
        <Link
          href="/chat"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: "10px 4px 8px",
            color: isActive("/chat") ? "var(--brand)" : "var(--muted)",
            textDecoration: "none",
            position: "relative",
            minHeight: 56,
          }}
        >
          <div style={{ position: "relative" }}>
            <IconMessage
              size={22}
              strokeWidth={isActive("/chat") ? 2.2 : 1.8}
              color={isActive("/chat") ? "var(--brand)" : "var(--muted)"}
            />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -7,
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: "50%",
                  fontSize: 9,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  border: "1.5px solid rgba(242,244,248,0.78)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: isActive("/chat") ? 600 : 500,
              letterSpacing: 0.1,
            }}
          >
            Чаты
          </span>
        </Link>

        {/* Добавить — special center button */}
        <Link
          href="/add"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: "4px 4px 8px",
            textDecoration: "none",
            minHeight: 56,
          }}
        >
          <div
            style={{
              background: isActive("/add") ? "var(--brand-dark)" : "var(--brand)",
              borderRadius: "50%",
              width: 42,
              height: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px var(--brand-glow)",
              flexShrink: 0,
            }}
          >
            <IconPlus size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: isActive("/add") ? "var(--brand)" : "var(--muted)",
              letterSpacing: 0.1,
            }}
          >
            Добавить
          </span>
        </Link>

        {/* Аккаунт */}
        <Link
          href={user ? "/me" : "/login"}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: "10px 4px 8px",
            color: isActive("/me") || isActive("/login") ? "var(--brand)" : "var(--muted)",
            textDecoration: "none",
            minHeight: 56,
          }}
        >
          <IconUser
            size={22}
            strokeWidth={isActive("/me") || isActive("/login") ? 2.2 : 1.8}
            color={isActive("/me") || isActive("/login") ? "var(--brand)" : "var(--muted)"}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: isActive("/me") || isActive("/login") ? 600 : 500,
              letterSpacing: 0.1,
            }}
          >
            {user ? "Профиль" : "Войти"}
          </span>
        </Link>
      </nav>
    </>
  );
}
