"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getListings, type Listing } from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";
import { getFavorites } from "@/services/favorites";
import { getCarMakes, getCarModels, type CarMake, type CarModel } from "@/services/car-makes";
import { ListingCard } from "@/components/ListingCard";
import { CitySearchPopup } from "@/components/CitySearchPopup";
import { SearchInput, saveSearchTerm, getSearchHistory } from "@/components/SearchInput";
import { useMe } from "@/hooks/useMe";

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function TypoSuggestion({ query, onSelect }: { query: string; onSelect: (v: string) => void }) {
  if (!query.trim()) return null;
  const history = getSearchHistory();
  const lower = query.toLowerCase();
  const best = history
    .map((h) => ({ h, dist: levenshtein(lower, h.toLowerCase()) }))
    .filter(({ dist, h }) => dist > 0 && dist <= 3 && h.toLowerCase() !== lower)
    .sort((a, b) => a.dist - b.dist)[0];
  if (!best) return null;
  return (
    <div style={{ marginTop: 14, fontSize: 13 }}>
      Возможно, вы имели в виду:{" "}
      <button
        className="btn ghost"
        onClick={() => onSelect(best.h)}
        style={{ fontSize: 13, padding: "2px 8px", color: "var(--brand)", fontWeight: 600 }}
      >
        {best.h}
      </button>
    </div>
  );
}

export default function SearchClient() {
  const searchParams = useSearchParams();
  const { user } = useMe();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [parentCategoryId, setParentCategoryId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>(searchParams.get("category") || "");
  const [cityId, setCityId] = useState<string>(searchParams.get("cityId") || "");
  const [cityName, setCityName] = useState("");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [sort, setSort] = useState<"default" | "cheap" | "expensive" | "new">("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Car filter state
  const [carMakes, setCarMakes] = useState<CarMake[]>([]);
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [carMakeId, setCarMakeId] = useState<string>("");
  const [carModelId, setCarModelId] = useState<string>("");
  const [carYearFrom, setCarYearFrom] = useState<string>("");
  const [carYearTo, setCarYearTo] = useState<string>("");

  // Sync URL params when they change (e.g. user searches from header while on /search)
  const prevSearchParamsRef = useRef(searchParams.toString());
  useEffect(() => {
    const current = searchParams.toString();
    if (current === prevSearchParamsRef.current) return;
    prevSearchParamsRef.current = current;
    setQ(searchParams.get("q") || "");
    const newCat = searchParams.get("category") || "";
    setCategoryId(newCat);
    setParentCategoryId(""); // will be synced by the category sync effect
    setCityId(searchParams.get("cityId") || "");
    setCityName("");
    setMinPrice(searchParams.get("minPrice") || "");
    setMaxPrice(searchParams.get("maxPrice") || "");
  }, [searchParams]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
    getCarMakes().then(setCarMakes).catch(() => setCarMakes([]));
  }, []);

  useEffect(() => {
    if (user) {
      getFavorites()
        .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.listingId))))
        .catch(() => {});
    }
  }, [user]);

  // Load models when make is selected
  useEffect(() => {
    if (carMakeId) {
      getCarModels(Number(carMakeId))
        .then(setCarModels)
        .catch(() => setCarModels([]));
    } else {
      setCarModels([]);
    }
    setCarModelId("");
  }, [carMakeId]);

  // Sync parentCategoryId from URL category param when categories load
  useEffect(() => {
    if (!categoryId || categories.length === 0) return;
    const id = Number(categoryId);
    // Check if it's a root category
    const root = categories.find((c) => c.id === id);
    if (root) {
      setParentCategoryId(String(root.id));
      return;
    }
    // Check if it's a subcategory
    for (const cat of categories) {
      if (cat.children?.some((sub) => sub.id === id)) {
        setParentCategoryId(String(cat.id));
        return;
      }
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get subcategories for selected parent category
  const selectedParentCategory = useMemo(() => {
    if (!parentCategoryId) return null;
    return categories.find((c) => c.id === Number(parentCategoryId)) || null;
  }, [parentCategoryId, categories]);

  const subcategories = useMemo(() => {
    return selectedParentCategory?.children || [];
  }, [selectedParentCategory]);

  // Determine if selected category has car filter enabled
  const selectedCategoryHasCarFilter = useMemo(() => {
    if (!categoryId) return false;
    const id = Number(categoryId);
    for (const cat of categories) {
      if (cat.id === id && cat.hasCarFilter) return true;
      if (cat.children) {
        for (const sub of cat.children) {
          if (sub.id === id && sub.hasCarFilter) return true;
        }
      }
    }
    return false;
  }, [categoryId, categories]);

  // Reset car filters when switching to non-car category
  useEffect(() => {
    if (!selectedCategoryHasCarFilter) {
      setCarMakeId("");
      setCarModelId("");
      setCarYearFrom("");
      setCarYearTo("");
    }
  }, [selectedCategoryHasCarFilter]);

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
        carMakeId?: number;
        carModelId?: number;
        carYearFrom?: number;
        carYearTo?: number;
      } = {};

      if (categoryId) params.categoryId = Number(categoryId);
      if (cityId) params.cityId = Number(cityId);
      if (minPrice && !isNaN(Number(minPrice))) params.minPrice = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) params.maxPrice = Number(maxPrice);
      if (q.trim()) params.search = q.trim();

      if (selectedCategoryHasCarFilter) {
        if (carMakeId) params.carMakeId = Number(carMakeId);
        if (carModelId) params.carModelId = Number(carModelId);
        if (carYearFrom && !isNaN(Number(carYearFrom))) params.carYearFrom = Number(carYearFrom);
        if (carYearTo && !isNaN(Number(carYearTo))) params.carYearTo = Number(carYearTo);
      }

      if (q.trim()) saveSearchTerm(q.trim());

      getListings(params)
        .then(setListings)
        .catch((e) => {
          setError(e.message || "Ошибка загрузки объявлений");
          setListings([]);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [q, categoryId, cityId, minPrice, maxPrice, carMakeId, carModelId, carYearFrom, carYearTo, selectedCategoryHasCarFilter]);

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
            <SearchInput
              value={q}
              onChange={setQ}
              onSubmit={(v) => saveSearchTerm(v)}
              placeholder="Название товара..."
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
            <select
              value={parentCategoryId}
              onChange={(e) => {
                const val = e.target.value;
                setParentCategoryId(val);
                setCategoryId(val); // default to parent category (all)
              }}
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {subcategories.length > 0 && (
            <div>
              <div className="field-label">Подкатегория</div>
              <select
                value={categoryId === parentCategoryId ? "" : categoryId}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategoryId(val || parentCategoryId);
                }}
              >
                <option value="">Все в «{selectedParentCategory?.name}»</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Car filters — shown only when selected category has hasCarFilter=true */}
          {selectedCategoryHasCarFilter && (
            <>
              <div
                style={{
                  borderTop: "1px solid var(--line-solid)",
                  paddingTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Параметры авто
                </div>

                <div>
                  <div className="field-label">Марка</div>
                  <select
                    value={carMakeId}
                    onChange={(e) => setCarMakeId(e.target.value)}
                  >
                    <option value="">Все марки</option>
                    {carMakes.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="field-label">Модель</div>
                  <select
                    value={carModelId}
                    onChange={(e) => setCarModelId(e.target.value)}
                    disabled={!carMakeId}
                  >
                    <option value="">Все модели</option>
                    {carModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.generation ? ` (${m.generation})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="field-label">Год выпуска</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="input"
                      placeholder="от"
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={carYearFrom}
                      onChange={(e) => setCarYearFrom(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="до"
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={carYearTo}
                      onChange={(e) => setCarYearTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

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
                <TypoSuggestion query={q} onSelect={setQ} />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
    </>
  );
}
