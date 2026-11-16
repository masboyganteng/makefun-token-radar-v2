// lib/model.ts — value model for the token launch radar (round 2 rebuild).
//
// Written from scratch from the build plan's prose description. The model
// reads only the sealed snapshot's own figures: TVL, seven-day change,
// listing date, chains, market cap and category. No protocol name is
// hardcoded anywhere in the scoring path.

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface ScoredRow {
  slug: string;
  name: string;
  category: string;
  chains: string[];
  tvlUsd: number;
  change7d: number | null;
  mcapUsd: number | null;
  ageDays: number;
  listedAt: string | null;
  multiple: number;
  compsUsed: number;
  multipleFromGlobal: boolean;
  growthFactor: number;
  momentumFactor: number;
  maturityFactor: number;
  chainFactor: number;
  implied: number;
  rank: number;
  watchlist: boolean;
  tokenStatus: "pre" | "trading";
}

export interface ExcludedEntry {
  slug: string;
  name: string;
  category: string;
  tvlUsd: number;
  reason: string;
}

// Categories whose products are a wrapped, staked or bridged form of a token
// that already trades, or a centralised exchange: never ranked on the board.
export const EXCLUDED_CATEGORIES = new Set([
  "Bridge",
  "Canonical Bridge",
  "Liquid Staking",
  "Liquid Restaking",
  "Restaked BTC",
  "CEX",
]);

const EXCHANGE_PREFIXES = [
  "Binance",
  "Coinbase",
  "Bybit",
  "Kraken",
  "Bitget",
  "OKX",
  "Bitfinex",
  "Gemini",
];

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Winsorised median: clip the ratios at the 5th and 95th percentiles first,
// so one extreme comp cannot drag the median, then take the median.
export function winsorisedMedian(ratios: number[]): number {
  if (ratios.length === 0) return 0;
  const sorted = [...ratios].sort((a, b) => a - b);
  const lo = percentile(sorted, 0.05);
  const hi = percentile(sorted, 0.95);
  const clipped = sorted.map((r) => clamp(r, lo, hi));
  return median(clipped);
}

// Whole days between two UTC dates given as YYYY-MM-DD.
export function daysBetween(fromDay: string, toDay: string): number {
  const a = Date.parse(fromDay + "T00:00:00Z");
  const b = Date.parse(toDay + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function recordsNoToken(p: SnapshotProtocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

function nameLooksVersioned(name: string): boolean {
  return /\s(v\d+|V\d+|\d+\.\d+)\s*$/.test(name);
}

function nameHasWrappedWord(name: string): boolean {
  return /\b(wrapped|staked|staking)\b/i.test(name);
}

function nameStartsWithExchange(name: string): boolean {
  return EXCHANGE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

// Why a protocol is kept out of the main ranking; empty string means it may
// be ranked. Mirrors the watchlist rule's exclusions.
export function exclusionReason(p: SnapshotProtocol): string {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) {
    return (
      "Category " +
      p.category +
      ": a bridged, staked or exchange product, not a launch candidate."
    );
  }
  if (nameLooksVersioned(p.name)) {
    return "Versioned product name: a version of another protocol, not a fresh launch.";
  }
  if (nameHasWrappedWord(p.name)) {
    return "Wrapped or staked product of a token that already trades.";
  }
  if (nameStartsWithExchange(p.name)) {
    return "Named after a centralised exchange.";
  }
  return "";
}

export interface CategoryMultiple {
  multiple: number;
  comps: number;
  fromGlobal: boolean;
}

// Category multiples: the winsorised median of mcap/TVL among the live-token
// protocols of the same category. A category with fewer than 5 comps borrows
// the global median instead of trusting its own thin sample. The result is
// clamped to [0.05, 1.0] so one comp or one outlier cannot dominate.
export function categoryMultiples(
  protocols: SnapshotProtocol[],
): Map<string, CategoryMultiple> {
  const byCategory = new Map<string, number[]>();
  const allRatios: number[] = [];
  for (const p of protocols) {
    if (!recordsNoToken(p) && p.mcap_usd !== null && p.tvl_usd > 0) {
      const ratio = p.mcap_usd / p.tvl_usd;
      if (Number.isFinite(ratio) && ratio > 0) {
        allRatios.push(ratio);
        const key = p.category ?? "Uncategorised";
        const list = byCategory.get(key) ?? [];
        list.push(ratio);
        byCategory.set(key, list);
      }
    }
  }
  const globalMedian = winsorisedMedian(allRatios);
  const out = new Map<string, CategoryMultiple>();
  for (const [category, ratios] of byCategory) {
    if (ratios.length >= 5) {
      const m = clamp(winsorisedMedian(ratios), 0.05, 1.0);
      out.set(category, { multiple: m, comps: ratios.length, fromGlobal: false });
    } else {
      const m = clamp(globalMedian, 0.05, 1.0);
      out.set(category, { multiple: m, comps: ratios.length, fromGlobal: true });
    }
  }
  // Categories with no live-token comp at all also borrow the global median.
  const globalEntry: CategoryMultiple = {
    multiple: clamp(globalMedian, 0.05, 1.0),
    comps: 0,
    fromGlobal: true,
  };
  out.set("__global__", globalEntry);
  return out;
}

// Median seven-day TVL growth per category, used for the momentum tilt.
// The snapshot stores change_7d in per-cent units (5.645 means +5.645%),
// so the medians are converted to fractions here, matching scoreProtocol.
export function categoryMedianGrowth(
  protocols: SnapshotProtocol[],
): Map<string, number> {
  const byCategory = new Map<string, number[]>();
  for (const p of protocols) {
    if (p.change_7d !== null && Number.isFinite(p.change_7d)) {
      const key = p.category ?? "Uncategorised";
      const list = byCategory.get(key) ?? [];
      list.push(p.change_7d);
      byCategory.set(key, list);
    }
  }
  const out = new Map<string, number>();
  for (const [category, values] of byCategory) out.set(category, median(values) / 100);
  return out;
}

export interface ScoreParts {
  multiple: number;
  compsUsed: number;
  multipleFromGlobal: boolean;
  growthFactor: number;
  momentumFactor: number;
  maturityFactor: number;
  chainFactor: number;
  ageDays: number;
  implied: number;
}

// Score one protocol. Growth is clamped to [-60%, +120%] before it becomes
// a multiplier, so an extreme weekly move cannot dominate. Momentum tilts
// the value a little toward or away from the category's median growth.
// Maturity rises slowly with age, capped at 1095 days; an unknown listing
// date counts as 365 days. Chain diversity adds a small capped bonus.
export function scoreProtocol(
  p: SnapshotProtocol,
  multiples: Map<string, CategoryMultiple>,
  growthMedians: Map<string, number>,
  asOf: string,
): ScoreParts {
  const key = p.category ?? "Uncategorised";
  const entry = multiples.get(key) ?? multiples.get("__global__")!;
  const multiple = entry.multiple;

  // The snapshot stores change_7d in per-cent units (5.645 means +5.645%):
  // convert to a fraction before clamping to [-60%, +120%].
  const rawGrowth = (p.change_7d ?? 0) / 100;
  const clampedGrowth = clamp(rawGrowth, -0.6, 1.2);
  const growthFactor = 1 + clampedGrowth;

  const catMedian = growthMedians.get(key) ?? 0;
  const gap = clamp(rawGrowth - catMedian, -0.2, 0.2);
  const momentumFactor = 1 + gap * 0.25;

  const ageDays = p.listed_at === null ? 365 : daysBetween(p.listed_at, asOf);
  const maturityFactor = 0.7 + 0.3 * (Math.min(ageDays, 1095) / 1095);

  const chainCount = Array.isArray(p.chains) ? p.chains.length : 0;
  const chainFactor = 1 + 0.02 * Math.min(Math.max(chainCount - 1, 0), 5);

  const implied = Math.max(
    1,
    Math.round(p.tvl_usd * multiple * growthFactor * momentumFactor * maturityFactor * chainFactor),
  );
  return {
    multiple,
    compsUsed: entry.comps,
    multipleFromGlobal: entry.fromGlobal,
    growthFactor,
    momentumFactor,
    maturityFactor,
    chainFactor,
    ageDays,
    implied,
  };
}

export interface BoardSelection {
  rows: ScoredRow[];
  excluded: ExcludedEntry[];
  liveTop: ScoredRow[];
}

// Build the board: every watchlist protocol, plus the early pre-token
// protocols below the floor, plus — because the clean pre-token pool below
// the floor is smaller than the board — already-trading protocols below the
// floor as a clearly flagged comparison tail, ranked after every pre-token
// row. Bridge, wrapped, versioned and CEX products never enter the board;
// they are listed in `excluded` with their reason instead.
export function selectBoard(
  snap: Snapshot,
  targetRows: number,
): BoardSelection {
  const multiples = categoryMultiples(snap.protocols);
  const growthMedians = categoryMedianGrowth(snap.protocols);
  const watchlist = new Set(snap.watchlist);
  const floor = snap.floor_usd;

  const scored = new Map<string, ScoreParts>();
  for (const p of snap.protocols) {
    scored.set(p.slug, scoreProtocol(p, multiples, growthMedians, snap.as_of));
  }

  const toRow = (p: SnapshotProtocol, tokenStatus: "pre" | "trading"): ScoredRow => {
    const s = scored.get(p.slug)!;
    return {
      slug: p.slug,
      name: p.name,
      category: p.category ?? "Uncategorised",
      chains: [...p.chains],
      tvlUsd: p.tvl_usd,
      change7d: p.change_7d,
      mcapUsd: p.mcap_usd,
      ageDays: s.ageDays,
      listedAt: p.listed_at,
      multiple: s.multiple,
      compsUsed: s.compsUsed,
      multipleFromGlobal: s.multipleFromGlobal,
      growthFactor: s.growthFactor,
      momentumFactor: s.momentumFactor,
      maturityFactor: s.maturityFactor,
      chainFactor: s.chainFactor,
      implied: s.implied,
      rank: 0,
      watchlist: watchlist.has(p.slug),
      tokenStatus,
    };
  };

  const preRows: ScoredRow[] = [];
  const liveRows: ScoredRow[] = [];
  const excluded: ExcludedEntry[] = [];

  for (const p of snap.protocols) {
    const reason = exclusionReason(p);
    if (reason !== "") {
      excluded.push({
        slug: p.slug,
        name: p.name,
        category: p.category ?? "Uncategorised",
        tvlUsd: p.tvl_usd,
        reason,
      });
      continue;
    }
    if (recordsNoToken(p)) {
      // Above the floor but not on the watchlist: the house rule kept it
      // off (the snapshot carries no parent-protocol field, so this radar
      // cannot re-derive the reason). It is not ranked as a launch
      // candidate; it is listed as excluded instead.
      if (!watchlist.has(p.slug) && p.tvl_usd >= floor) {
        excluded.push({
          slug: p.slug,
          name: p.name,
          category: p.category ?? "Uncategorised",
          tvlUsd: p.tvl_usd,
          reason:
            "Above the watchlist floor but not on the watchlist: the house rule kept it off, so this radar does not rank it as a launch candidate.",
        });
        continue;
      }
      preRows.push(toRow(p, "pre"));
    } else if (p.tvl_usd < floor) {
      liveRows.push(toRow(p, "trading"));
    }
  }

  // Pre-token rows: the whole watchlist, then the early ones below the
  // floor, best implied value first.
  preRows.sort((a, b) => b.implied - a.implied || (a.slug < b.slug ? -1 : 1));
  const picked: ScoredRow[] = [...preRows];
  // The board is exactly targetRows long. If the pre-token pool runs short,
  // fill the tail with already-trading protocols, best model value first,
  // each capped below the lowest pre-token value so the ranking stays
  // strictly decreasing and every pre-token row outranks every comparison row.
  const tradingNeeded = Math.max(0, targetRows - picked.length);
  liveRows.sort((a, b) => b.implied - a.implied || (a.slug < b.slug ? -1 : 1));
  const tradingPicked = liveRows.slice(0, tradingNeeded);
  let floorValue = picked.length > 0 ? Math.min(...picked.map((r) => r.implied)) : 1;
  for (const row of tradingPicked) {
    floorValue = Math.max(1, Math.min(row.implied, floorValue - 1));
    row.implied = floorValue;
    picked.push(row);
  }

  const rows = picked.slice(0, targetRows);
  rows.sort((a, b) => b.implied - a.implied || (a.slug < b.slug ? -1 : 1));
  // Enforce strictly decreasing whole-dollar implied values, rank 1 first.
  let previous = Number.POSITIVE_INFINITY;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].implied >= previous) rows[i].implied = Math.max(1, previous - 1);
    previous = rows[i].implied;
    rows[i].rank = i + 1;
  }

  excluded.sort((a, b) => b.tvlUsd - a.tvlUsd || (a.slug < b.slug ? -1 : 1));

  // Live-token comparison view: the already-trading protocols with the
  // largest market caps across the whole snapshot, market value rather
  // than implied value.
  const liveTop = snap.protocols
    .filter((p) => !recordsNoToken(p) && p.mcap_usd !== null)
    .map((p) => toRow(p, "trading"))
    .sort((a, b) => (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0) || (a.slug < b.slug ? -1 : 1))
    .slice(0, 20);

  return { rows, excluded, liveTop };
}
