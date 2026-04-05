"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      style={{
        background: "rgba(248, 249, 251, 0.82)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.7)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.05)",
      }}
    >
      <div className="container" style={{ paddingTop: 20, paddingBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "var(--brand)",
                fontSize: 16,
              }}
            >
              TENOT
            </span>
            <span
              className="muted"
              style={{ fontSize: 13, borderLeft: "1px solid var(--line-solid)", paddingLeft: 10 }}
            >
              © 2025 — объявления без лишнего
            </span>
          </div>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[
              { href: "/docs/terms", label: "Соглашение" },
              { href: "/docs/privacy", label: "Конфиденциальность" },
              { href: "/docs/rules", label: "Правила" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  padding: "4px 10px",
                  borderRadius: 8,
                  transition: "color 0.2s, background 0.2s",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--brand)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--brand-light)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
