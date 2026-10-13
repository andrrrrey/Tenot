import type { Metadata } from "next";
import Link from "next/link";
import { CategoriesGrid } from "@/components/CategoriesGrid";

export const metadata: Metadata = {
  title: "Все категории — Tenot",
};

export default function CategoriesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 className="h2">Все категории</h1>
        <Link href="/" className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
          На главную
        </Link>
      </div>
      <CategoriesGrid full />
    </div>
  );
}
