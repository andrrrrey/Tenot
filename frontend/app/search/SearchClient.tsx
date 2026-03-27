"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getListings, type Listing } from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";
import { getFavorites } from "@/services/favorites";
import { ListingCard } from "@/components/ListingCard";
import { CitySearchPopup } from "@/components/CitySearchPopup";
import { useMe } from "@/hooks/useMe";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const { user } = useMe();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [categoryId, setCategoryId] = useState<string>(searchParams.get("category") || "");
  const [cityId, setCityId] = useState<string>(searchParams.get("cityId") || "");
  const [cityName, setCityName] = useState("");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [sort, setSort] = useState<"default" | "cheap" | "expensive" | "new">("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sync URL params when they change (e.g. user searches from header while on /search)
  const prevSearchParamsRef = useRef(searchParams.toString());
  useEffect(() => {
    const current = searchParams.toString();
    if (current === prevSearchParamsRef.current) return;
    prevSearchParamsRef.current = current;
    setQ(searchParams.get("q") || "");
    setCategoryId(searchParams.get("category") || "");
    setCityId(searchParams.get("cityId") || "");
    setCityName("");
    setMinPrice(searchParams.get("minPrice") || "");
    setMaxPrice(searchParams.get("maxPrice") || "");
  }, [searchParams]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (user) {
      getFavorites()
        .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.listingId))))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      const params: {
        categoryId?: number;
        minPrice?: number;
        maxPrice?: number;
        search?: string;
        cityId?: number;
      } = {};

      if (categoryId) params.categoryId = Number(categoryId);
      if (cityId) params.cityId = Number(cityId);
      if (minPrice && !isNaN(Number(minPrice))) params.minPrice = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) params.maxPrice = Number(maxPrice);
      if (q.trim()) params.search = q.trim();

      getListings(params)
        .then(setListings)
        .catch((e) => {
          setError(e.message || "Ошибка загрузки объявлений");
          setListings([]);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [q, categoryId, cityId, minPrice, maxPrice]);

  const sortedListings = useMemo(() => {
    if (sort === "default") return listings;
    const list = [...listings];
    if (sort === "cheap") list.sort((a, b) => a.price - b.price);
    if (sort === "expensive") list.sort((a, b) => b.price - a.price);
    if (sort === "new") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [listings, sort]);

  const handleFavoriteChange = (listingId: number, isFav: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(listingId);
      else next.delete(listingId);
      return next;
    });
  };

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .search-filters-toggle { display: flex !important; }
        .search-filters-body { display: none !important; flex-direction: column; gap: 14px; }
        .search-filters-body.open { display: flex !important; }
        .search-results-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 900px) {
        .search-layout > aside,
        .search-layout > section {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      }
    `}</style>
    <div className="grid search-layout" style={{ alignItems: "start" }}>
      {/* Sidebar */}
      <aside
        className="card"
        style={{
          gridColumn: "span 3",
          position: "sticky",
          top: 76,
          alignSelf: "start",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="h2">Фильтры</div>
          <button
            className="btn search-filters-toggle"
            onClick={() => setFiltersOpen(v => !v)}
            style={{ display: "none", fontSize: 13, padding: "6px 12px" }}
          >
            {filtersOpen ? "Скрыть ▲" : "Показать ▼"}
          </button>
        </div>

        <div className={`search-filters-body${filtersOpen ? " open" : ""}`} style={{ flexDirection: "column", gap: 14 }}>
          <div>
            <div className="field-label">Поиск</div>
            <input
              className="input"
              placeholder="Название товара..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <div className="field-label">Город</div>
            <CitySearchPopup
              value={cityId}
              selectedName={cityName}
              onChange={(id, name) => { setCityId(id); setCityName(name); }}
              placeholder="Все города"
            />
          </div>

          <div>
            <div className="field-label">Категория</div>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Все категории</option>
              {categories.map((c) =>
                c.children && c.children.length > 0 ? (
                  <optgroup key={c.id} label={c.name}>
                    <option value={c.id}>{c.name} (все)</option>
                    {c.children.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <div className="field-label">Цена</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                placeholder="от"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <input
                className="input"
                placeholder="до"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="field-label">Сортировка</div>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="default">По умолчанию</option>
              <option value="cheap">Сначала дешевле</option>
              <option value="expensive">Сначала дороже</option>
              <option value="new">По дате</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Results */}
      <section style={{ gridColumn: "span 9" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div className="h2">Результаты</div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              fontWeight: 500,
              background: "var(--card-solid)",
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid var(--line-solid)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            {loading ? "Загрузка..." : `${sortedListings.length} объявл.`}
          </div>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div
            className="search-results-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : (
          <div
            className="search-results-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {sortedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}

            {!loading && sortedListings.length === 0 && (
              <div
                className="card"
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: 48,
                  color: "var(--muted)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Ничего не найдено</div>
                <div style={{ fontSize: 14 }}>Попробуйте изменить фильтры</div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
    </>
  );
}
