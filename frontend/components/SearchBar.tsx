"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CitySearchPopup } from "@/components/CitySearchPopup";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cityId, setCityId] = useState("");
  const [cityName, setCityName] = useState("");

  return (
    <div className="row" style={{ gap: 10, flexWrap:"wrap" }}>
      <input className="input" style={{ flex: 1, minWidth: 240 }} value={q} onChange={e=>setQ(e.target.value)} placeholder="Что ищете?" />
      <div style={{ width: 170 }}>
        <CitySearchPopup
          value={cityId}
          selectedName={cityName}
          onChange={(id, name) => { setCityId(id); setCityName(name); }}
          placeholder="Город"
        />
      </div>
      <button className="btn primary" onClick={() => {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (cityId) params.set("cityId", cityId);
        router.push(`/search?${params.toString()}`);
      }}>
        Найти
      </button>
    </div>
  );
}
