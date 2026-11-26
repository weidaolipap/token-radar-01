# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/weidaolipap/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/weidaolipap/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar — pre-token protocols ranked by implied value (make.fun bounty token-radar-01).

## Run it

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

---

Entered on [make.fun](https://make.fun/?ref=75k23xv8&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards

## What it does

Reads a sealed DefiLlama snapshot (`/input/snapshot.json`, 758 protocols,
fetched 2026-11-14, watchlist floor $50M TVL, no token on record), scores
every pre-token protocol with the radar-2 model, and writes a ranked board
plus a static dashboard.

- **Board:** 178 rows — the 40-protocol watchlist plus 138 early pre-token
  protocols below the floor. Implied values strictly descending.
- **Top 3:** Steakhouse Financial ~$675.7M, Gauntlet ~$402.4M,
  Veda ~$368.1M (implied values, a model, not a price).
- **Model (radar-2):** `implied = TVL × 0.25 × growthMult × maturityMult
  × chainMult × categoryMult`
  - growth: 7-day change clamped to [-30%, +60%], half weight
  - maturity: hump-shaped, 0.70 at listing → 1.00 at 1,095 days → 0.75 at
    2,190 days; unknown age 0.85
  - chain: 0.95–1.00 by chain count (max 6)
  - category: published tilt 0.92–1.05; bridges, liquid-staking receipts
    and exchange products are excluded from the early radar
  - every protocol gets a 7-step farm plan derived from its own
    category, chains, TVL and age — no name is special-cased

Requires Node 22+ (tested on Node 24.22.1), standard library only.

Output: `board.json`, `data.js`, `dashboard/`, `screenshots/`,
`dossier.json`.

## Layout

- `main.ts` — entrypoint the grader runs
- `lib/model.ts` — the radar-2 model, board builder and farm plans
- `vendor/makefun-board.ts` — make.fun vendored library (unchanged)
- `dashboard/` — static page, no framework, no network; reads `data.js`
- `screenshots/` — board, a protocol detail view, a filtered view

## License

MIT — see `LICENSE`.
