"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { subscribeUnreadCount } from "@/components/ChatWidget";
import { IconHome, IconHeart, IconPlus, IconMessage, IconUser } from "@/components/Icons";

function NavIcon({
  active,
  badge,
  children,
}: {
  active: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: active
            ? "var(--brand)"
            : "rgba(255, 255, 255, 0.85)",
          border: active
            ? "1.5px solid rgba(255,255,255,0.25)"
            : "1.5px solid rgba(255,255,255,0.85)",
          boxShadow: active
            ? "0 4px 16px var(--brand-glow), 0 1px 0 rgba(255,255,255,0.3) inset"
            : "0 2px 8px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,0.9) inset",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: -2,
            right: -4,
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
            border: "1.5px solid rgba(242,244,248,0.9)",
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    return subscribeUnreadCount(setUnreadCount);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "8px 2px 6px",
    textDecoration: "none",
    color: active ? "var(--brand)" : "var(--muted)",
    minHeight: 62,
  });

  const labelStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 10,
    fontWeight: active ? 600 : 500,
    letterSpacing: 0.1,
    lineHeight: 1,
  });

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
          background: "rgba(238, 241, 248, 0.97)",
          borderTop: "1px solid rgba(0, 0, 0, 0.07)",
          boxShadow: "0 -1px 0 rgba(0,0,0,0.06), 0 -8px 32px rgba(0,0,0,0.04)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          alignItems: "stretch",
          justifyContent: "space-around",
        }}
      >
        {/* Главная */}
        <Link href="/" style={tabStyle(isActive("/"))}>
          <NavIcon active={isActive("/")}>
            <IconHome
              size={20}
              strokeWidth={isActive("/") ? 2.2 : 1.8}
              color={isActive("/") ? "#fff" : "var(--muted)"}
            />
          </NavIcon>
          <span style={labelStyle(isActive("/"))}>Главная</span>
        </Link>

        {/* Избранное */}
        <Link href="/me/fav" style={tabStyle(isActive("/me/fav"))}>
          <NavIcon active={isActive("/me/fav")}>
            <IconHeart
              size={20}
              strokeWidth={isActive("/me/fav") ? 2.2 : 1.8}
              color={isActive("/me/fav") ? "#fff" : "var(--muted)"}
              filled={isActive("/me/fav")}
            />
          </NavIcon>
          <span style={labelStyle(isActive("/me/fav"))}>Избранное</span>
        </Link>

        {/* Добавить — special center button */}
        <Link href="/add" style={{ ...tabStyle(false), flex: 1 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "var(--brand)",
              border: "2px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px var(--brand-glow), 0 2px 0 rgba(255,255,255,0.25) inset",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            <IconPlus size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--brand)", letterSpacing: 0.1, lineHeight: 1 }}>
            Добавить
          </span>
        </Link>

        {/* Чаты */}
        <Link href="/chat" style={tabStyle(isActive("/chat"))}>
          <NavIcon active={isActive("/chat")} badge={unreadCount}>
            <IconMessage
              size={20}
              strokeWidth={isActive("/chat") ? 2.2 : 1.8}
              color={isActive("/chat") ? "#fff" : "var(--muted)"}
            />
          </NavIcon>
          <span style={labelStyle(isActive("/chat"))}>Чаты</span>
        </Link>

        {/* Профиль */}
        <Link href={user ? "/me" : "/login"} style={tabStyle(isActive("/me") && !isActive("/me/fav") || isActive("/login"))}>
          <NavIcon active={isActive("/me") && !isActive("/me/fav") || isActive("/login")}>
            <IconUser
              size={20}
              strokeWidth={(isActive("/me") && !isActive("/me/fav") || isActive("/login")) ? 2.2 : 1.8}
              color={(isActive("/me") && !isActive("/me/fav") || isActive("/login")) ? "#fff" : "var(--muted)"}
            />
          </NavIcon>
          <span style={labelStyle(isActive("/me") && !isActive("/me/fav") || isActive("/login"))}>
            {user ? "Профиль" : "Войти"}
          </span>
        </Link>
      </nav>
    </>
  );
}
