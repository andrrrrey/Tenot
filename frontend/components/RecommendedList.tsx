"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getListings, type Listing } from "@/services/listings";
import { getFavorites } from "@/services/favorites";
import { ListingCard } from "@/components/ListingCard";
import { useMe } from "@/hooks/useMe";
import { getSearchHistory } from "@/components/SearchInput";

const PAGE_SIZE = 8;

export function RecommendedList() {
  const { user } = useMe();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [allListings, setAllListings] = useState<Listing[]>([]);

  useEffect(() => {
    const history = getSearchHistory();
    if (history.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Use first 3 history terms to find relevant listings
    const queries = history.slice(0, 3);
    const fetches = queries.map((q) => getListings({ search: q }).catch(() => []));

    Promise.all(fetches)
      .then((results) => {
        // Merge, deduplicate, sort by createdAt
        const seen = new Set<number>();
        const merged: Listing[] = [];
        for (const batch of results) {
          for (const l of batch) {
            if (!seen.has(l.id)) {
              seen.add(l.id);
              merged.push(l);
            }
          }
        }
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllListings(merged);
        setListings(merged.slice(0, PAGE_SIZE));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      getFavorites()
        .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.listingId))))
        .catch(() => {});
    }
  }, [user]);

  const handleFavoriteChange = (listingId: number, isFav: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(listingId);
      else next.delete(listingId);
      return next;
    });
  };

  const handleShowMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setListings(allListings.slice(0, nextPage * PAGE_SIZE));
  };

  // Don't render if no history terms or no results
  if (!loading && listings.length === 0) return null;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="h2">Рекомендуемое</h2>
      </div>

      {loading ? (
        <>
          <div className="fresh-grid">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
          <style>{`
            .fresh-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
            @media (max-width: 900px) { .fresh-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
          `}</style>
        </>
      ) : (
        <>
          <div className="fresh-grid">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
          <style>{`
            .fresh-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
            @media (max-width: 900px) { .fresh-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
          `}</style>

          {listings.length < allListings.length && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button className="btn" onClick={handleShowMore} style={{ fontSize: 14, padding: "12px 28px" }}>
                Посмотреть ещё
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
