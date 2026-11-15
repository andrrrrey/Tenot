/**
 * Ранжирование поисковой выдачи (п. 2.13).
 *
 * relevance (по умолчанию): score = свежесть + бусты за 360°-контент + текстовая релевантность.
 * Бусты выражены в «днях свежести»: объявление с 360°-вращением ранжируется так,
 * будто оно опубликовано на RANK_BOOST_360_DAYS дней позже. Это мягкая корректировка —
 * свежие объявления без 360° не тонут под старыми объявлениями с 360°.
 *
 * cheap / expensive / new: основной ключ сортировки задаёт пользователь,
 * при равенстве выше объявления с 360°-контентом.
 */

export const LISTING_SORTS = ['relevance', 'new', 'cheap', 'expensive'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export function parseListingSort(value?: string): ListingSort {
  return (LISTING_SORTS as readonly string[]).includes(value ?? '') ? (value as ListingSort) : 'relevance';
}

export type RankableListing = {
  id: number;
  title: string;
  description: string;
  price: number;
  createdAt: Date;
  has360: boolean;
  hasInterior: boolean;
};

export type RankingConfig = {
  /** Буст за 360°-вращение, в днях свежести. */
  boost360Days: number;
  /** Буст за панораму салона, в днях свежести. */
  boostInteriorDays: number;
  /** Буст за совпадение запроса в заголовке, в днях свежести. */
  boostTitleMatchDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function rankingConfigFromEnv(): RankingConfig {
  return {
    boost360Days: envNumber('RANK_BOOST_360_DAYS', 7),
    boostInteriorDays: envNumber('RANK_BOOST_INTERIOR_DAYS', 4),
    boostTitleMatchDays: envNumber('RANK_BOOST_TITLE_MATCH_DAYS', 3),
  };
}

/** Бонус за 360°-контент в днях свежести. */
export function media360BoostDays(l: Pick<RankableListing, 'has360' | 'hasInterior'>, cfg: RankingConfig): number {
  return (l.has360 ? cfg.boost360Days : 0) + (l.hasInterior ? cfg.boostInteriorDays : 0);
}

/** Score для сортировки по релевантности: «эффективная дата публикации» в днях. */
export function relevanceScore(l: RankableListing, cfg: RankingConfig, search?: string): number {
  let score = l.createdAt.getTime() / DAY_MS + media360BoostDays(l, cfg);
  const q = search?.trim().toLowerCase();
  if (q && l.title.toLowerCase().includes(q)) score += cfg.boostTitleMatchDays;
  return score;
}

/** 0 — нет 360°, 1 — один вид, 2 — вращение и салон. Для тай-брейка в явных сортировках. */
function media360Rank(l: Pick<RankableListing, 'has360' | 'hasInterior'>): number {
  return (l.has360 ? 1 : 0) + (l.hasInterior ? 1 : 0);
}

export function rankListings<T extends RankableListing>(
  listings: T[],
  sort: ListingSort,
  opts: { search?: string; config?: RankingConfig } = {},
): T[] {
  const cfg = opts.config ?? rankingConfigFromEnv();
  const by360 = (a: T, b: T) => media360Rank(b) - media360Rank(a);
  const byNew = (a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime();
  const byId = (a: T, b: T) => b.id - a.id;

  let cmp: (a: T, b: T) => number;
  switch (sort) {
    case 'cheap':
      cmp = (a, b) => a.price - b.price || by360(a, b) || byNew(a, b) || byId(a, b);
      break;
    case 'expensive':
      cmp = (a, b) => b.price - a.price || by360(a, b) || byNew(a, b) || byId(a, b);
      break;
    case 'new':
      cmp = (a, b) => byNew(a, b) || by360(a, b) || byId(a, b);
      break;
    default: {
      const scores = new Map<number, number>();
      for (const l of listings) scores.set(l.id, relevanceScore(l, cfg, opts.search));
      cmp = (a, b) => scores.get(b.id)! - scores.get(a.id)! || by360(a, b) || byId(a, b);
    }
  }
  return [...listings].sort(cmp);
}
