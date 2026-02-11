"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { getCities, type City } from "@/services/cities";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useStore();
  const [q, setQ] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState<string>("");

  useEffect(() => {
    getCities()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cityId) params.set("cityId", cityId);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <header style={{ borderBottom:"1px solid var(--line)", background:"#fff" }}>
      <div className="container" style={{ padding:"12px 16px" }}>
        <div className="row" style={{ justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div className="row" style={{ gap: 12 }}>
            <Link href="/" style={{ fontWeight:900, letterSpacing:0.5, color:"var(--brand)", fontSize: 22 }}>
              TENOT
            </Link>
            <span className="muted" style={{ fontSize: 12, display: pathname === "/" ? "none" : "inline" }}>
              объявления без лишнего
            </span>
          </div>

          <div className="row" style={{ flex:1, maxWidth: 600, gap: 8 }}>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              style={{ padding: "8px 10px", maxWidth: 160, fontSize: 13 }}
            >
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Поиск…"
              onKeyDown={(e)=>{
                if (e.key === "Enter") handleSearch();
              }}
            />
            <button className="btn" onClick={handleSearch}>
              Найти
            </button>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <Link className="btn primary" href="/add">Разместить</Link>
            <Link className="btn" href={user ? "/me" : "/login"}>
              {user ? "Профиль" : "Войти"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
