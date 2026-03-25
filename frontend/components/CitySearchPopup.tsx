"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { searchCities, getCityDistricts, type City } from "@/services/cities";
import { IconChevronDown, IconChevronRight, IconX, IconArrowLeft, IconMapPin } from "@/components/Icons";

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
        if (step === "district") { setStep("city"); setPendingCity(null); }
        else setOpen(false);
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

  const regions = useMemo(() => results.filter((c) => c.type === "REGION"), [results]);
  const settlements = useMemo(() => results.filter((c) => c.type !== "REGION"), [results]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: compact ? "9px 12px" : "11px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1.5px solid var(--line-solid)",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          textAlign: "left",
          cursor: "pointer",
          fontSize: compact ? 13 : 14,
          color: selectedName ? "var(--text)" : "var(--muted-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: "inherit",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px var(--brand-light)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line-solid)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          {selectedName && <IconMapPin size={13} color="var(--brand)" strokeWidth={2} style={{ flexShrink: 0 }} />}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedName || placeholder}
          </span>
        </div>
        <IconChevronDown size={14} color="var(--muted-light)" strokeWidth={2} style={{ flexShrink: 0 }} />
      </button>

      {/* Backdrop — rendered via portal to escape any stacking context from parent */}
      {open && mounted && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            ref={popupRef}
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(32px) saturate(200%)",
              WebkitBackdropFilter: "blur(32px) saturate(200%)",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: 480,
              height: "70vh",
              maxHeight: 560,
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid rgba(255,255,255,0.9)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 20px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderBottom: "1px solid var(--line-solid)",
                flexShrink: 0,
              }}
            >
              {step === "district" && (
                <button
                  type="button"
                  onClick={handleBackToCity}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 8,
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                >
                  <IconArrowLeft size={18} strokeWidth={2} />
                </button>
              )}
              <div style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>
                {step === "district" && pendingCity ? `Районы: ${pendingCity.name}` : "Выбор города"}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 999,
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  width: 30,
                  height: 30,
                  justifyContent: "center",
                }}
              >
                <IconX size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Search input (city step) */}
            {step === "city" && (
              <div style={{ padding: "12px 20px", flexShrink: 0 }}>
                <input
                  ref={inputRef}
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Введите название города..."
                  style={{ fontSize: 14 }}
                />
              </div>
            )}

            {/* Results list */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: step === "city" ? "0 12px 16px" : "12px 12px 16px",
              }}
            >
              {step === "city" && (
                <>
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
                        borderBottom: "1px solid var(--line-solid)",
                        cursor: "pointer",
                        color: "var(--muted)",
                        fontSize: 13,
                        marginBottom: 4,
                        fontFamily: "inherit",
                      }}
                    >
                      Сбросить выбор
                    </button>
                  )}

                  {(loading || districtsLoading) && (
                    <div className="muted" style={{ padding: "12px 12px", fontSize: 13 }}>
                      Поиск...
                    </div>
                  )}

                  {!loading && !districtsLoading && regions.length === 0 && settlements.length === 0 && query.trim() && (
                    <div className="muted" style={{ padding: "12px 12px", fontSize: 13 }}>
                      Ничего не найдено
                    </div>
                  )}

                  {!loading && regions.length > 0 && (
                    <div>
                      <SectionLabel>Регионы</SectionLabel>
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
                      <SectionLabel>Города и населённые пункты</SectionLabel>
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

              {step === "district" && pendingCity && (
                <>
                  <button
                    type="button"
                    onClick={handleSelectWholeCity}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      textAlign: "left",
                      background: value === String(pendingCity.id) ? "var(--brand-light)" : "none",
                      border: "none",
                      borderBottom: "1px solid var(--line-solid)",
                      cursor: "pointer",
                      fontSize: 14,
                      marginBottom: 4,
                      borderRadius: 8,
                      fontWeight: value === String(pendingCity.id) ? 600 : 400,
                      color: value === String(pendingCity.id) ? "var(--brand)" : "var(--text)",
                      fontFamily: "inherit",
                    }}
                  >
                    Весь город
                  </button>

                  {districtsLoading && (
                    <div className="muted" style={{ padding: "12px 12px", fontSize: 13 }}>
                      Загрузка районов...
                    </div>
                  )}

                  {!districtsLoading && districts.length > 0 && (
                    <div>
                      <SectionLabel>Районы</SectionLabel>
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
        </div>,
        document.body
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "10px 12px 4px",
      }}
    >
      {children}
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
      <span style={{ fontWeight: 700, color: "var(--brand)" }}>{text.slice(idx, idx + query.length)}</span>
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
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 12px",
        textAlign: "left",
        background: isSelected ? "var(--brand-light)" : "none",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 14,
        fontFamily: "inherit",
        transition: "background 0.12s",
        color: isSelected ? "var(--brand)" : "var(--text)",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "none";
      }}
    >
      <div>
        <div style={{ fontWeight: isSelected ? 600 : 400 }}>
          <HighlightMatch text={city.name} query={query} />
        </div>
        {city.region && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
            {city.region.name}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {city.type !== "CITY" && city.type !== "REGION" && TYPE_LABELS[city.type] && (
          <span
            style={{
              fontSize: 11,
              color: "var(--muted)",
              background: "rgba(0,0,0,0.05)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {TYPE_LABELS[city.type]}
          </span>
        )}
        {hasDistricts && <IconChevronRight size={14} color="var(--muted-light)" strokeWidth={2} />}
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
        background: isSelected ? "var(--brand-light)" : "none",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: isSelected ? 600 : 400,
        fontFamily: "inherit",
        color: isSelected ? "var(--brand)" : "var(--text)",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "none";
      }}
    >
      {district.name}
    </button>
  );
}
