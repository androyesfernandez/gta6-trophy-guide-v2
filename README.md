[![rank](https://make.fun/badge/gta6-trophy-guide-01/androyesfernandez/gta6-trophy-guide-v2/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/androyesfernandez/gta6-trophy-guide-v2/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![competition](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# The Leonida Field Guide — GTA VI Trophy Guide & Tracker

All 55 GTA VI trophies with a full guide for each: 291 cited steps, 64 dated sources on 22 sites, 35 disputes shown both ways, a 7-stage roadmap, missable windows with last-chance chapters, interactive PSN counters and a Next-up planner.

Every headline number above is computed by the app itself from its data files (`app/data/trophies.json`, `app/data/sources.json`, `app/data/roadmap.json`) — open the tracker and the audit strip under the header shows the same figures, derived live by `computeAudit()`.

## What is inside

- **Tracker** — stage-grouped checklist for all 55 trophies with search, kind / grade / status filters, sorting, spoiler mode, export / import / reset, per-trophy notes, and a guide pane that leads with cited steps, dispute panels (Version A vs Version B, plus our call) and an interactive counter with a tick grid for each of the 19 counted trophies.
- **Roadmap** — seven stages (Ch 1 · Ch 2 · Ch 3 · Ch 4 · Finale · Free roam & side work · 100% & platinum), each with cited action steps, plus a completion-facts strip where every fact carries its own citations.
- **Missables** — one possibly missable trophy (Positive Mental Attitude, Chapter 1 window) and a 15-trophy watch list rendered as a windows timeline grid with last-chance cells, story gates by chapter, and a manual-save protocol.
- **Sources** — the numbered, dated source registry with reading-depth tags and computed cited-by counts, a trophy × source claims matrix, and a conflicts index listing every dispute with its verdict.
- **Next up** — a planner that queues open trophies in roadmap order (star your own to lead the queue) and sums the hours left, overall and per stage.

Progress is stored locally in the browser. The app is fully offline and uses no external assets and no Rockstar artwork.

## Running it

Serve the app locally with `node serve.ts`, then open http://localhost:8080. To build the submission dossier: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
