# Token Radar — pre-token protocols ranked by implied value

Entry for the make.fun bounty **"Build the best token launch radar"**
(token-radar-01, $1,325, deadline 2026-12-14 10:00 UTC).

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

## Run it

Requires Node 22+ (tested on Node 24.22.1), standard library only.

```bash
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

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
