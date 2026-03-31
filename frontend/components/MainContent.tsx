"use client";

import { usePathname } from "next/navigation";

const FULL_WIDTH_PREFIXES = ["/admin", "/add", "/edit"];

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = FULL_WIDTH_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <main
      className={`container main-content${isFullWidth ? " container-full" : ""}`}
      style={{ flex: 1 }}
    >
      {children}
    </main>
  );
}
