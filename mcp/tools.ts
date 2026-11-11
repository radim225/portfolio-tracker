import { z } from 'zod';
import {
  getPortfolioOverview,
  getOpenPositions,
  getClosedTrades,
  getDividends,
  getCashflow,
  getPortfolioTimeline,
  getSyncStatus,
} from '../lib/db/queries.js';
import { buildTimeline, filterTimeline } from '../lib/calc/timeline.js';

// Each tool: schema + handler. Imported by server.ts.

export const tools = [
  {
    name: 'portfolio_overview',
    description:
      'Returns current portfolio KPIs: total value, unrealized P&L, realized P&L, dividends, total return, and yield. All amounts in CZK.',
    schema: z.object({}),
    handler: async () => getPortfolioOverview(),
  },

  {
    name: 'list_positions',
    description: 'Returns all open positions with per-ticker quantity, prices, P&L, and dividend yield.',
    schema: z.object({}),
    handler: async () => getOpenPositions(),
  },

  {
    name: 'closed_trades',
    description: 'Returns FIFO-paired closed trades with P&L, hold days, and dividends earned during hold. Optionally filter by ticker or date.',
    schema: z.object({
      ticker: z.string().optional().describe('Filter to a single ticker, e.g. "AAPL_US_EQ"'),
      since: z.string().optional().describe('ISO date string (YYYY-MM-DD) — only return trades closed on or after this date'),
      limit: z.number().int().positive().max(500).optional().describe('Max rows to return'),
    }),
    handler: async ({ ticker, since, limit }: { ticker?: string; since?: string; limit?: number }) =>
      getClosedTrades({ ticker, since: since ? new Date(since) : undefined, limit }),
  },

  {
    name: 'dividends',
    description: 'Returns dividend payment history with totals and breakdown by ticker. Optionally filter by ticker or date range.',
    schema: z.object({
      ticker: z.string().optional(),
      from: z.string().optional().describe('ISO date (YYYY-MM-DD)'),
      to: z.string().optional().describe('ISO date (YYYY-MM-DD)'),
    }),
    handler: async ({ ticker, from, to }: { ticker?: string; from?: string; to?: string }) =>
      getDividends({ ticker, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined }),
  },

  {
    name: 'cashflow',
    description: 'Returns transaction history (deposits, withdrawals, interest, cashback). Optionally filter by type or date range.',
    schema: z.object({
      type: z
        .enum(['DEPOSIT', 'WITHDRAW', 'INTEREST_ON_CASH', 'CASHBACK'])
        .optional()
        .describe('Transaction type filter'),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
    handler: async ({ type, from, to }: { type?: string; from?: string; to?: string }) =>
      getCashflow({ type, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined }),
  },

  {
    name: 'portfolio_timeline',
    description:
      'Returns the portfolio value over time, with invested-capital and P&L per day. Interpolated between known daily snapshots.',
    schema: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      bucket: z.enum(['day', 'week', 'month']).optional().default('day'),
    }),
    handler: async ({ from, to, bucket }: { from?: string; to?: string; bucket?: 'day' | 'week' | 'month' }) => {
      const snaps = await getPortfolioTimeline({
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      });
      const timeline = buildTimeline(snaps);
      return filterTimeline(timeline, { from, to, bucket });
    },
  },

  {
    name: 'sync_status',
    description: 'Returns the last sync run status (time, rows added, any error) and total row counts per table.',
    schema: z.object({}),
    handler: async () => getSyncStatus(),
  },
] as const;
