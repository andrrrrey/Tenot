"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSearchSuggestions } from "@/services/listings";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

export function saveSearchTerm(term: string) {
  if (!term.trim()) return;
  const trimmed = term.trim();
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: string[] = raw ? JSON.parse(raw) : [];
    const filtered = history.filter((h) => h.toLowerCase() !== trimmed.toLowerCase());
    filtered.unshift(trimmed);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
  } catch {}
}

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeSearchTerm(term: string) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: string[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter((h) => h !== term)));
  } catch {}
}

type SuggestionItem = { text: string; kind: "history" | "listing" };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
};

export function SearchInput({ value, onChange, onSubmit, placeholder = "Поиск...", style, inputStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history whenever dropdown opens
  useEffect(() => {
    if (open) setHistory(getSearchHistory());
  }, [open]);

  // Fetch live suggestions from backend as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setApiSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      getSearchSuggestions(value.trim())
        .then(setApiSuggestions)
        .catch(() => setApiSuggestions([]));
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build merged suggestion list: history items first, then unique API results
  const items: SuggestionItem[] = (() => {
    if (!value.trim()) {
      return history.slice(0, 8).map((t) => ({ text: t, kind: "history" as const }));
    }
    const lower = value.toLowerCase();
    const historyMatches = history
      .filter((h) => h.toLowerCase().includes(lower))
      .slice(0, 3)
      .map((t) => ({ text: t, kind: "history" as const }));
    const historyTexts = new Set(historyMatches.map((h) => h.text.toLowerCase()));
    const apiItems = apiSuggestions
      .filter((s) => !historyTexts.has(s.toLowerCase()))
      .slice(0, 6 - historyMatches.length)
      .map((t) => ({ text: t, kind: "listing" as const }));
    return [...historyMatches, ...apiItems];
  })();

  const handleSelect = (term: string) => {
    onChange(term);
    setOpen(false);
    onSubmit?.(term);
  };

  const handleRemove = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeSearchTerm(term);
    setHistory(getSearchHistory());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      saveSearchTerm(value.trim());
      setOpen(false);
      onSubmit?.(value.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <input
        className="input"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
      />

      {open && items.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--card-solid)",
            border: "1px solid var(--line-solid)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow)",
            zIndex: 999,
            overflow: "hidden",
          }}
        >
          {!value.trim() && (
            <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Недавние поиски
            </div>
          )}
          {value.trim() && items.some((i) => i.kind === "listing") && items.some((i) => i.kind === "history") && (
            <div style={{ padding: "6px 12px 2px", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              История
            </div>
          )}
          {items.map((item, idx) => {
            const prevKind = idx > 0 ? items[idx - 1].kind : null;
            const showDivider = item.kind === "listing" && prevKind === "history";
            return (
              <div key={`${item.kind}-${item.text}`}>
                {showDivider && (
                  <div style={{ padding: "6px 12px 2px", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderTop: "1px solid var(--line-solid)", marginTop: 4 }}>
                    Варианты
                  </div>
                )}
                <div
                  onMouseDown={() => handleSelect(item.text)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", fontSize: 14, color: "var(--text)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--soft-solid)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  {item.kind === "history" ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <polyline points="12 8 12 12 14 14" /><circle cx="12" cy="12" r="9" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
                    </svg>
                  )}
                  <span style={{ flex: 1 }}>
                    {/* Bold-highlight matching prefix */}
                    {value.trim() && item.text.toLowerCase().startsWith(value.toLowerCase())
                      ? <><strong>{item.text.slice(0, value.length)}</strong>{item.text.slice(value.length)}</>
                      : item.text}
                  </span>
                  {item.kind === "history" && (
                    <button
                      onMouseDown={(e) => handleRemove(e, item.text)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", fontSize: 13, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
