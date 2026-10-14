import type { Listing } from "@/services/listings";
import { getFavoritesCount } from "@/services/listings";
import { IconEye, IconHeart } from "@/components/Icons";

type Props = {
  listing: Pick<Listing, "viewsCount" | "_count">;
  /** Overrides the favorites count from the listing (e.g. after a local toggle). */
  favoritesCount?: number;
  size?: number;
  style?: React.CSSProperties;
};

/** Views and favorites counters shown for every listing. */
export function ListingStats({ listing, favoritesCount, size = 12, style }: Props) {
  const favs = favoritesCount ?? getFavoritesCount(listing);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--muted)",
        fontSize: size,
        fontWeight: 500,
        ...style,
      }}
    >
      <span title="Просмотры" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <IconEye size={size + 2} strokeWidth={1.8} />
        {listing.viewsCount ?? 0}
      </span>
      <span title="В избранном" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <IconHeart size={size + 1} strokeWidth={1.8} />
        {favs}
      </span>
    </div>
  );
}
