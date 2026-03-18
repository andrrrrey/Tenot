"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { searchCities, getCityDistricts, type City } from "@/services/cities";

const TYPE_LABELS: Record<string, string> = {
  CITY: "Города",
  TOWN: "Посёлки",
  VILLAGE: "Сёла и деревни",
};

type Props = {
  value: string;
  selectedName: string;
  onChange: (cityId: string, cityName: string) => void;
  placeholder?: string;
  compact?: boolean;
};

export function CitySearchPopup({
  value,
  selectedName,
  onChange,
  placeholder = "Выберите город",
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);

  // District selection step
  const [step, setStep] = useState<"city" | "district">("city");
  const [pendingCity, setPendingCity] = useState<City | null>(null);
  const [districts, setDistricts] = useState<City[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback((q: string) => {
    setLoading(true);
    searchCities(q)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open || step !== "city") return;
    const timer = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, open, step, doSearch]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setStep("city");
      setPendingCity(null);
      setDistricts([]);
      doSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, doSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (step === "district") {
          setStep("city");
          setPendingCity(null);
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCityClick = (city: City) => {
    // Only cities/towns can have districts, not regions or villages
    if (city.type === "CITY" || city.type === "TOWN") {
      setDistrictsLoading(true);
      getCityDistricts(city.id)
        .then((list) => {
          if (list.length > 0) {
            setPendingCity(city);
            setDistricts(list);
            setStep("district");
          } else {
            onChange(String(city.id), city.name);
            setOpen(false);
          }
        })
        .catch(() => {
          onChange(String(city.id), city.name);
          setOpen(false);
        })
        .finally(() => setDistrictsLoading(false));
    } else {
      onChange(String(city.id), city.name);
      setOpen(false);
    }
  };

  const handleDistrictSelect = (district: City) => {
    onChange(String(district.id), district.name);
    setOpen(false);
  };

  const handleSelectWholeCity = () => {
    if (!pendingCity) return;
    onChange(String(pendingCity.id), pendingCity.name);
    setOpen(false);
  };

  const handleBackToCity = () => {
    setStep("city");
    setPendingCity(null);
    setDistricts([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClear = () => {
    onChange("", "");
    setOpen(false);
  };

  const regions = useMemo(
    () => results.filter((c) => c.type === "REGION"),
    [results]
  );
  const settlements = useMemo(
    () => results.filter((c) => c.type !== "REGION"),
    [results]
  );

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: compact ? "8px 10px" : "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "#fff",
          textAlign: "left",
          cursor: "pointer",
          fontSize: compact ? 13 : 14,
          color: selectedName ? "var(--text)" : "var(--muted)",
          maxWidth: compact ? 160 : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedName || placeholder}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ flexShrink: 0, opacity: 0.4 }}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            ref={popupRef}
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "90%",
              maxWidth: 480,
              height: "70vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {step === "district" && (
                  <button
                    type="button"
                    onClick={handleBackToCity}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 0",
                      fontSize: 20,
                      color: "var(--muted)",
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Назад"
                  >
                    ←
                  </button>
                )}
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {step === "district" && pendingCity
                    ? `Районы: ${pendingCity.name}`
                    : "Выбор города"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  fontSize: 20,
                  color: "var(--muted)",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Search input — only on city step */}
            {step === "city" && (
              <div style={{ padding: "12px 20px", flexShrink: 0 }}>
                <input
                  ref={inputRef}
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Начните вводить название..."
                  style={{
                    padding: "12px 14px",
                    fontSize: 15,
                  }}
                />
              </div>
            )}

            {/* Results */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: step === "city" ? "0 20px 16px" : "12px 20px 16px",
              }}
            >
              {/* ---- City selection step ---- */}
              {step === "city" && (
                <>
                  {/* Clear selection option */}
                  {value && (
                    <button
                      type="button"
                      onClick={handleClear}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        borderBottom: "1px solid var(--line)",
                        cursor: "pointer",
                        color: "var(--muted)",
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      Сбросить выбор
                    </button>
                  )}

                  {(loading || districtsLoading) && (
                    <div
                      className="muted"
                      style={{ padding: "12px 0", fontSize: 14 }}
                    >
                      Поиск...
                    </div>
                  )}

                  {!loading && !districtsLoading && regions.length === 0 && settlements.length === 0 && query.trim() && (
                    <div
                      className="muted"
                      style={{ padding: "12px 0", fontSize: 14 }}
                    >
                      Ничего не найдено
                    </div>
                  )}

                  {!loading && regions.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          padding: "8px 0 4px",
                        }}
                      >
                        Регионы
                      </div>
                      {regions.map((region) => (
                        <CityRow
                          key={region.id}
                          city={region}
                          isSelected={value === String(region.id)}
                          onClick={() => handleCityClick(region)}
                          query={query}
                        />
                      ))}
                    </div>
                  )}

                  {!loading && settlements.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          padding: "8px 0 4px",
                        }}
                      >
                        Города и населённые пункты
                      </div>
                      {settlements.map((city) => (
                        <CityRow
                          key={city.id}
                          city={city}
                          isSelected={value === String(city.id)}
                          onClick={() => handleCityClick(city)}
                          query={query}
                          hasDistricts={city.type === "CITY" || city.type === "TOWN"}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ---- District selection step ---- */}
              {step === "district" && pendingCity && (
                <>
                  {/* Select whole city option */}
                  <button
                    type="button"
                    onClick={handleSelectWholeCity}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      textAlign: "left",
                      background: value === String(pendingCity.id) ? "var(--soft)" : "none",
                      border: "none",
                      borderBottom: "1px solid var(--line)",
                      cursor: "pointer",
                      fontSize: 14,
                      marginBottom: 8,
                      borderRadius: 8,
                      fontWeight: value === String(pendingCity.id) ? 600 : 400,
                      color: "var(--text)",
                    }}
                  >
                    Весь город
                  </button>

                  {districtsLoading && (
                    <div
                      className="muted"
                      style={{ padding: "12px 0", fontSize: 14 }}
                    >
                      Загрузка районов...
                    </div>
                  )}

                  {!districtsLoading && districts.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          padding: "8px 0 4px",
                        }}
                      >
                        Районы
                      </div>
                      {districts.map((district) => (
                        <DistrictRow
                          key={district.id}
                          district={district}
                          isSelected={value === String(district.id)}
                          onClick={() => handleDistrictSelect(district)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function CityRow({
  city,
  isSelected,
  onClick,
  query,
  hasDistricts,
}: {
  city: City;
  isSelected: boolean;
  onClick: () => void;
  query: string;
  hasDistricts?: boolean;
}) {
  const isRegion = city.type === "REGION";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 12px",
        textAlign: "left",
        background: isSelected ? "var(--soft)" : "none",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 14,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = "var(--soft)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = "none";
      }}
    >
      <div>
        <div style={{ fontWeight: isSelected ? 600 : 400 }}>
          <HighlightMatch text={city.name} query={query} />
        </div>
        {city.region && (
          <div
            style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}
          >
            {city.region.name}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {!isRegion && city.type !== "CITY" && TYPE_LABELS[city.type] && (
          <span
            style={{
              fontSize: 11,
              color: "var(--muted)",
              background: "var(--soft)",
              padding: "2px 8px",
              borderRadius: 999,
              border: "1px solid var(--line)",
            }}
          >
            {TYPE_LABELS[city.type]}
          </span>
        )}
        {hasDistricts && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ opacity: 0.4 }}
          >
            <path
              d="M4.5 2.5L8 6L4.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </button>
  );
}

function DistrictRow({
  district,
  isSelected,
  onClick,
}: {
  district: City;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 12px",
        textAlign: "left",
        background: isSelected ? "var(--soft)" : "none",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: isSelected ? 600 : 400,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = "var(--soft)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = "none";
      }}
    >
      {district.name}
    </button>
  );
}
