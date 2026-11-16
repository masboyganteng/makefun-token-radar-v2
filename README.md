[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/masboyganteng/makefun-token-radar-v2/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/masboyganteng/makefun-token-radar-v2/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Launch Radar v2

Which pre-token protocol is worth farming next — ranked by implied launch value, each with a concrete farm plan. Built for make.fun's **token-radar-01** bounty ("Build the best token launch radar", $1,325 in USDC).

This is the round-2 rebuild: a fresh implementation of the value model with robust calibration (winsorised category multiples, global-median fallback for thin categories, clamped multiples), per-protocol farm plans for the whole watchlist, a transparent model breakdown per protocol, and a minimal dossier.

## How it works

`main.ts` (Node 22, standard library only) reads the sealed snapshot at `/input/snapshot.json` and writes:

- `board.json` — 226 ranked rows: all 40 watchlist protocols, the early pre-token protocols below the $50,000,000 floor, plus already-trading protocols below the floor as a clearly flagged comparison tail (ranked last, never launch candidates). Each row carries an implied value and a 6-step farm plan.
- `data.js` — the dashboard's data (board rows with model components, live-token comparison, excluded list).
- `dashboard/` + `screenshots/` — copied to the output.
- `dossier.json` — built last with `buildDossier` from `vendor/makefun-board.ts`.

Run it locally:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to>/snapshot.json
```

Two runs on the same input write byte-identical outputs: no clock, no randomness; ages are measured from the snapshot's `as_of` date.

## The value model

Implied value = TVL × category multiple × growth factor × momentum tilt × maturity factor × chain factor.

- **Category multiple:** winsorised median of market-cap / TVL among the live-token protocols of the same category. Categories with fewer than 5 comps borrow the global median. Clamped to 0.05–1.0.
- **Growth factor:** the 7-day TVL change, clamped to −60% … +120%.
- **Momentum tilt:** growth above/below the category's median growth earns a small bonus/penalty.
- **Maturity factor:** days from first listing to the snapshot date, capped at 1,095 days; unknown listing date counts as 365 days.
- **Chain factor:** small capped bonus per chain.

The dashboard shows every component's number for every protocol, so any row can be checked by hand.

## Language honesty

The board says a protocol **"records no token"**, never that it has none — a DefiLlama record is not proof. Nothing here promises a token launch or an airdrop; farm steps say "if there is a points/rewards program". Implied value is this entry's own claim.

## Layout

- `main.ts` — entrypoint (root)
- `lib/model.ts` — the value model and board selection
- `lib/farm.ts` — farm-plan generation (per-protocol profiles for the watchlist, category plans for the rest)
- `vendor/makefun-board.ts` — dossier builder, byte-for-byte from the kit
- `dashboard/` — `index.html`, `app.css`, `app.js` (no network: system fonts only, data loaded from local `data.js`)
- `screenshots/` — board, protocol detail, filtered view (1440×900)

## License

MIT — see `LICENSE`.
