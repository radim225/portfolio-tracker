# Investment Tracker — Trading 212

Automatic portfolio dashboard for Trading 212. A nightly GitHub Actions job pulls the account history from the Trading 212 public API, stores it in Neon Postgres and a Next.js dashboard on Vercel renders it. No manual input, no CSV exports.

**What it shows beyond the broker app:** history over time, realised P&L per closed trade (FIFO), dividend income incl. withholding tax, and deposits vs. portfolio value.

## At a glance

| | |
|---|---|
| Data pipeline | Trading 212 API → rate-limit-aware client with cursor pagination → Drizzle ORM → Neon Postgres |
| Scheduling | GitHub Actions cron (nightly, DST-safe) + one-time backfill script |
| Dashboard | Next.js 15 server components, Recharts, Tailwind |
| Analytics | FIFO lot matching, KPIs, time-series bucketing (`lib/calc/`, unit-tested with Vitest) |
| AI access | Read-only MCP server (7 tools: overview, positions, closed trades, dividends, cashflow, timeline, sync status) |

```
Trading 212 API ──► lib/t212 (client, pagination, 429 back-off)
                          │
         scripts/sync.ts / backfill.ts (GitHub Actions, nightly)
                          │
                    Neon Postgres (Drizzle schema + migrations)
                          │
          ┌───────────────┴───────────────┐
   Next.js dashboard (Vercel)      MCP server (local, read-only)
```

> Screenshot: _add a screenshot with demo or blurred values before publishing._

**Privacy:** the repository contains code only. Portfolio data lives in the database, credentials only in `.env` / GitHub Secrets / Vercel env (see `.env.example`).

## Features

- **Overview** — portfolio value over time, invested capital, P&L, deposit markers.
- **Open positions** — per-ticker P&L, dividend yield, visual bar.
- **Closed trades** — FIFO-paired buys against sells with hold days, per-trade P&L, win rate.
- **Dividends** — totals, per-ticker breakdown, monthly bar, cumulative line, withholding tax.
- **Cashflow** — deposits / withdrawals / interest.

All amounts in CZK (the account's primary currency). Locale `cs-CZ`.

## Setup

1. **Create a free Neon project** at [neon.tech](https://neon.tech) → copy `DATABASE_URL`.
2. **Generate a Trading 212 API key** in the T212 app → Settings → API. ([help](https://helpcentre.trading212.com/hc/en-us/articles/14584770928157-Trading-212-API-key))
3. **Local dev:** copy `.env.example` → `.env` and fill in:
   ```
   T212_API_KEY=...
   DATABASE_URL=postgresql://...
   ```
4. **GitHub Secrets** (Settings → Secrets and variables → Actions) — add both:
   - `T212_API_KEY`
   - `DATABASE_URL`
5. **Vercel Environment Variables** — add `DATABASE_URL` to all environments.
6. **First run — one-time backfill (~30–60 min because of API rate limits):**
   ```
   pnpm install
   pnpm db:migrate     # apply schema to Neon
   pnpm backfill       # paces to API rate limits (6 req/min on history endpoints)
   ```
   After this, **everything runs automatically in the cloud — you don't have to do this again.**
7. The daily sync then runs via GitHub Actions at 23:55 Prague time (two cron entries cover DST).
8. **Deploy:** connect the repo to Vercel → first deploy completes → dashboard is live at your Vercel URL.

## Day-to-day

- Open the Vercel URL. Data reflects the latest sync.
- To trigger a sync manually: GitHub → Actions → "Daily Portfolio Sync" → Run workflow.
- To run a sync locally: `pnpm sync`.

## MCP server (optional)

A local Model Context Protocol server lets Claude (or any MCP client) query your portfolio directly. See [README-DEV.md](./README-DEV.md#mcp-server) for config.

## Tests

```
pnpm test        # Vitest (FIFO matching)
pnpm typecheck
```

## Tech

Next.js 15 · TypeScript · Tailwind · Recharts · Drizzle ORM · Neon Postgres · Vitest · MCP SDK.

## Security

- Trading 212 API keys can be scoped to read-only and IP-restricted in the T212 app.
- Never commit `.env`. This repo's `.gitignore` excludes it.
- The MCP server exposes read-only query tools — no order placement.
