"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions: string[] = (() => {
    if (!value.trim()) return history.slice(0, 8);
    const lower = value.toLowerCase();
    const exact = history.filter((h) => h.toLowerCase().includes(lower));
    if (exact.length >= 3) return exact.slice(0, 6);
    // fuzzy: allow 1-2 character edits for suggestions from history
    const fuzzy = history
      .filter((h) => !exact.includes(h))
      .map((h) => ({ h, dist: levenshtein(lower, h.toLowerCase().slice(0, lower.length + 2)) }))
      .filter(({ dist }) => dist <= 2)
      .sort((a, b) => a.dist - b.dist)
      .map(({ h }) => h);
    return [...exact, ...fuzzy].slice(0, 6);
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
      {open && suggestions.length > 0 && (
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
          {suggestions.map((s) => (
            <div
              key={s}
              onMouseDown={() => handleSelect(s)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 12px",
                cursor: "pointer",
                fontSize: 14,
                color: "var(--text)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--soft-solid)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <polyline points="12 8 12 12 14 14" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span style={{ flex: 1 }}>{s}</span>
              <button
                onMouseDown={(e) => handleRemove(e, s)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", fontSize: 13, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
