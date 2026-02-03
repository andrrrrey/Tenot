"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getListings, type Listing } from "@/services/listings";
import { getCategories, type Category } from "@/services/categories";
import { getFavorites } from "@/services/favorites";
import { ListingCard } from "@/components/ListingCard";
import { useMe } from "@/hooks/useMe";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const { user } = useMe();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Фильтры - инициализация из URL
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [categoryId, setCategoryId] = useState<string>(
    searchParams.get("category") || ""
  );
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [sort, setSort] = useState<"new" | "cheap" | "expensive">("new");

  // Загрузка категорий
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Загрузка избранного для покупателя
  useEffect(() => {
    if (user?.role === "BUYER") {
      getFavorites()
        .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.listingId))))
        .catch(() => {});
    }
  }, [user]);

  // Загрузка объявлений с фильтрами (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      const params: {
        categoryId?: number;
        minPrice?: number;
        maxPrice?: number;
        search?: string;
      } = {};

      if (categoryId) params.categoryId = Number(categoryId);
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
  }, [q, categoryId, minPrice, maxPrice]);

  // Сортировка на клиенте
  const sortedListings = useMemo(() => {
    const list = [...listings];
    if (sort === "new") {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    if (sort === "cheap") list.sort((a, b) => a.price - b.price);
    if (sort === "expensive") list.sort((a, b) => b.price - a.price);
    return list;
  }, [listings, sort]);

  const handleFavoriteChange = (listingId: number, isFav: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) {
        next.add(listingId);
      } else {
        next.delete(listingId);
      }
      return next;
    });
  };

  return (
    <div className="grid">
      <aside
        className="card"
        style={{
          gridColumn: "span 3",
          position: "sticky",
          top: 16,
          alignSelf: "start",
        }}
      >
        <div className="h2">Поиск</div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <input
            className="input"
            placeholder="Например: iPhone, диван..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="row" style={{ gap: 10 }}>
            <input
              className="input"
              placeholder="Цена от"
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

          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="new">Сортировка: свежее</option>
            <option value="cheap">Сначала дешевле</option>
            <option value="expensive">Сначала дороже</option>
          </select>

          {user?.role === "SUPPLIER" && (
            <Link className="btn primary" href="/add">
              Разместить
            </Link>
          )}
        </div>
      </aside>

      <section style={{ gridColumn: "span 9" }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="h2">Результаты</div>
          <div className="muted">
            {loading ? "Загрузка..." : `${sortedListings.length} объявл.`}
          </div>
        </div>

        {error && (
          <div className="card" style={{ marginTop: 12, color: "red" }}>
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
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
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              Ничего не найдено. Попробуйте изменить фильтры.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
