// main.ts — token launch radar, round 2 rebuild.
//
// Reads the sealed snapshot, ranks the protocols by the value model in
// lib/model.ts, writes the board, the dashboard data, copies the dashboard
// and screenshots, and writes the dossier with buildDossier from the
// vendor library. Node 22, standard library only.
//
// Usage:
//   node main.ts --input /input/snapshot.json --output /output
//   MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
//
// Defaults: input /input/snapshot.json, output $MAKEFUN_OUTPUT_DIR or
// /output. Two runs on the same input write byte-identical outputs: no
// clock, no randomness, ages measured from the snapshot's as_of date.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-board.ts";
import { selectBoard } from "./lib/model.ts";
import type { Snapshot } from "./lib/model.ts";
import { farmSteps, SPECIAL_NOTES } from "./lib/farm.ts";

const TARGET_ROWS = 226;
const TEXT_MAX_BYTES = 65536;

function parseArgs(argv: string[]): { input: string; output: string } {
  let input = "/input/snapshot.json";
  let output = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input" && i + 1 < argv.length) input = argv[++i];
    else if (argv[i] === "--output" && i + 1 < argv.length) output = argv[++i];
    else if (argv[i].startsWith("--input=")) input = argv[i].slice("--input=".length);
    else if (argv[i].startsWith("--output=")) output = argv[i].slice("--output=".length);
  }
  return { input, output };
}

async function main(): Promise<void> {
  const { input, output } = parseArgs(process.argv.slice(2));
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(output);
  mkdirSync(outDir, { recursive: true });

  const snap: Snapshot = JSON.parse(readFileSync(input, "utf8"));
  const { rows, excluded, liveTop } = selectBoard(snap, TARGET_ROWS);

  const boardRows = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    rank: row.rank,
    implied_value_usd: row.implied,
    farm_steps: farmSteps(row),
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvlUsd,
    change_7d: row.change7d,
    mcap_usd: row.mcapUsd,
    age_days: row.ageDays,
    multiple: row.multiple,
    comps_used: row.compsUsed,
    multiple_from_global: row.multipleFromGlobal,
    growth_factor: row.growthFactor,
    momentum_factor: row.momentumFactor,
    maturity_factor: row.maturityFactor,
    chain_factor: row.chainFactor,
    token_status: row.tokenStatus,
    watchlist: row.watchlist,
    note: SPECIAL_NOTES[row.slug] ?? null,
  }));

  const board = {
    as_of: snap.as_of,
    floor_usd: snap.floor_usd,
    rows: boardRows,
  };
  writeFileSync(join(outDir, "board.json"), JSON.stringify(board, null, 2) + "\n", "utf8");

  const dashboardData = {
    meta: {
      as_of: snap.as_of,
      floor_usd: snap.floor_usd,
      watchlist_count: snap.watchlist.length,
      row_count: rows.length,
      model:
        "Implied value = TVL x category multiple (winsorised median mcap/TVL of live-token comps; global median when fewer than 5 comps; clamped 0.05-1.0) x growth factor (7d change clamped -60% to +120%) x momentum tilt vs category median growth x maturity factor (age capped at 1095 days; unknown listing counts as 365) x chain factor (capped).",
      disclaimer:
        "Implied value is this entry's own claim, not a promise that a token will launch. The snapshot records no token for the pre-token rows; a record is not proof.",
    },
    rows: boardRows,
    live_top: liveTop.map((row) => ({
      slug: row.slug,
      name: row.name,
      category: row.category,
      chains: row.chains,
      tvl_usd: row.tvlUsd,
      change_7d: row.change7d,
      mcap_usd: row.mcapUsd,
      age_days: row.ageDays,
      multiple: row.multiple,
    })),
    excluded: excluded.slice(0, 40),
    excluded_total: excluded.length,
  };
  writeFileSync(
    join(outDir, "data.js"),
    "window.TOKEN_RADAR_DATA = " + JSON.stringify(dashboardData) + ";\n",
    "utf8",
  );

  const dashboardSrc = join(repoRoot, "dashboard");
  const screenshotsSrc = join(repoRoot, "screenshots");
  if (!existsSync(join(dashboardSrc, "index.html"))) {
    throw new Error("dashboard/index.html is missing from the repository");
  }
  if (!existsSync(screenshotsSrc)) {
    throw new Error("screenshots/ is missing from the repository");
  }
  cpSync(dashboardSrc, join(outDir, "dashboard"), { recursive: true });
  cpSync(screenshotsSrc, join(outDir, "screenshots"), { recursive: true });

  // The dossier is built last, from the finished output directory, and
  // written byte for byte as the vendor library returns it.
  const dossier = await buildDossier(outDir, { text_max_bytes: TEXT_MAX_BYTES });
  writeFileSync(join(outDir, "dossier.json"), dossier);

  console.log(
    `token-radar v2: ${rows.length} rows (${rows.filter((r) => r.watchlist).length} watchlist, ` +
      `${rows.filter((r) => r.tokenStatus === "trading").length} already-trading comparisons), ` +
      `${excluded.length} excluded, dossier ${dossier.length} bytes -> ${outDir}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
