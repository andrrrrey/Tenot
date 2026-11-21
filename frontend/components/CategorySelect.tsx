'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Category } from '@/services/categories';

type Option = { id: number; name: string; path: string; depth: number; norm: string };

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

function buildOptions(categories: Category[], prefix = '', depth = 0): Option[] {
  return categories.flatMap((c) => {
    const path = prefix ? `${prefix} › ${c.name}` : c.name;
    return [
      { id: c.id, name: c.name, path, depth, norm: normalize(c.name) },
      ...buildOptions(c.children || [], path, depth + 1),
    ];
  });
}

const MAX_RESULTS = 200;

/** Прокрутка только списка (без прокрутки страницы). */
function scrollToItem(list: HTMLElement | null, idx: number, center: boolean) {
  const el = list?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
  if (!list || !el) return;
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  if (center) list.scrollTop = top - (list.clientHeight - el.offsetHeight) / 2;
  else if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
}

/**
 * Выбор категории с поиском по названию (как в мобильном приложении).
 * Без запроса — дерево с отступами, с запросом — совпадения с полным путём.
 */
export function CategorySelect({
  categories,
  value,
  onChange,
  emptyLabel = 'Выберите категорию',
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const options = useMemo(() => buildOptions(categories), [categories]);
  const selected = useMemo(() => options.find((o) => String(o.id) === value) || null, [options, value]);

  const q = normalize(query);
  // null — пункт «пусто» (сброс выбора), доступен только без запроса
  const items: (Option | null)[] = useMemo(() => {
    if (!q) return [null, ...options];
    const starts: Option[] = [];
    const contains: Option[] = [];
    for (const o of options) {
      if (o.norm.startsWith(q)) starts.push(o);
      else if (o.norm.includes(q) || o.norm.split(/[\s,-]+/).some((w) => w.startsWith(q))) contains.push(o);
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [q, options]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const openPicker = () => {
    setQuery('');
    setActive(selected ? options.findIndex((o) => o.id === selected.id) + 1 : 0);
    setOpen(true);
  };

  // При открытии — прокрутка к текущей категории
  useEffect(() => {
    if (!open) return;
    scrollToItem(listRef.current, active, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollToItem(listRef.current, active, false);
  }, [active]);

  const choose = (o: Option | null) => {
    onChange(o ? String(o.id) : '');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length) choose(items[active] ?? null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const highlight = (name: string) => {
    if (!q) return name;
    const idx = normalize(name).indexOf(q);
    if (idx < 0) return name;
    return (
      <>
        {name.slice(0, idx)}
        <mark>{name.slice(idx, idx + q.length)}</mark>
        {name.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div className="cat-select" ref={rootRef}>
      <button
        type="button"
        className={`cat-select-trigger${selected ? '' : ' is-empty'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        title={selected?.path}
      >
        <span className="cat-select-value">{selected ? selected.name : emptyLabel}</span>
        {selected && selected.depth > 0 && (
          <span className="cat-select-path">{selected.path.split(' › ').slice(0, -1).join(' › ')}</span>
        )}
      </button>

      {open && (
        <>
          <div className="cat-select-backdrop" onClick={() => setOpen(false)} />
          <div className="cat-select-pop" role="dialog" aria-label="Категория">
            <div className="cat-select-head">
              <span>Категория</span>
              <button type="button" aria-label="Закрыть" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="cat-select-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                autoFocus
                value={query}
                placeholder="Поиск категории…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-controls={listId}
                aria-expanded
                aria-autocomplete="list"
              />
              {query && (
                <button type="button" className="cat-select-clear" aria-label="Очистить" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
                  ✕
                </button>
              )}
            </div>
            <div className="cat-select-list" ref={listRef} role="listbox" id={listId}>
              {items.length === 0 && <div className="cat-select-empty">Ничего не найдено</div>}
              {items.map((o, i) => {
                const isSel = o ? String(o.id) === value : value === '';
                const cls = `cat-select-opt${i === active ? ' is-active' : ''}${isSel ? ' is-selected' : ''}`;
                if (!o) {
                  return (
                    <div key="empty" data-idx={i} role="option" aria-selected={isSel} className={`${cls} is-muted`}
                      onMouseEnter={() => setActive(i)} onClick={() => choose(null)}>
                      {emptyLabel}
                    </div>
                  );
                }
                return (
                  <div
                    key={o.id}
                    data-idx={i}
                    role="option"
                    aria-selected={isSel}
                    className={cls}
                    style={q ? undefined : { paddingLeft: 14 + o.depth * 16, fontWeight: o.depth === 0 ? 700 : undefined }}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                  >
                    <div className="cat-select-name">{highlight(o.name)}</div>
                    {q && o.depth > 0 && <div className="cat-select-sub">{o.path}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
