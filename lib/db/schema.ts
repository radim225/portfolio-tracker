import {
  pgTable,
  text,
  numeric,
  timestamp,
  date,
  integer,
  serial,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';

// Monetary values are stored as numeric(18, 4) in CZK (the account's primary currency).
// Quantities as numeric(18, 8) to allow fractional shares.

export const instruments = pgTable('instruments', {
  ticker: text('ticker').primaryKey(),
  name: text('name'),
  nativeCurrency: text('native_currency'),
  type: text('type'),
  isin: text('isin'),
  exchange: text('exchange'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const positionsCurrent = pgTable('positions_current', {
  ticker: text('ticker').primaryKey(),
  quantity: numeric('quantity', { precision: 18, scale: 8 }).notNull(),
  averagePrice: numeric('average_price', { precision: 18, scale: 4 }).notNull(),
  currentPrice: numeric('current_price', { precision: 18, scale: 4 }).notNull(),
  pplCzk: numeric('ppl_czk', { precision: 18, scale: 4 }).notNull(),
  fxPplCzk: numeric('fx_ppl_czk', { precision: 18, scale: 4 }),
  initialFillDate: timestamp('initial_fill_date', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dailyPositionSnapshots = pgTable(
  'daily_position_snapshots',
  {
    date: date('date').notNull(),
    ticker: text('ticker').notNull(),
    quantity: numeric('quantity', { precision: 18, scale: 8 }).notNull(),
    currentPrice: numeric('current_price', { precision: 18, scale: 4 }).notNull(),
    marketValueCzk: numeric('market_value_czk', { precision: 18, scale: 4 }).notNull(),
    pplCzk: numeric('ppl_czk', { precision: 18, scale: 4 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.ticker] }),
  }),
);

export const portfolioSnapshots = pgTable('portfolio_snapshots', {
  date: date('date').primaryKey(),
  totalValueCzk: numeric('total_value_czk', { precision: 18, scale: 4 }).notNull(),
  freeCashCzk: numeric('free_cash_czk', { precision: 18, scale: 4 }).notNull(),
  investedCzk: numeric('invested_czk', { precision: 18, scale: 4 }).notNull(),
  totalPplCzk: numeric('total_ppl_czk', { precision: 18, scale: 4 }).notNull(),
  totalDepositsCzk: numeric('total_deposits_czk', { precision: 18, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ordersHistory = pgTable('orders_history', {
  id: text('id').primaryKey(),
  ticker: text('ticker').notNull(),
  filledAt: timestamp('filled_at', { withTimezone: true }).notNull(),
  filledQuantity: numeric('filled_quantity', { precision: 18, scale: 8 }).notNull(),
  fillPrice: numeric('fill_price', { precision: 18, scale: 4 }).notNull(),
  type: text('type').notNull(),
  side: text('side').notNull(), // 'BUY' | 'SELL' (derived: negative qty → SELL)
  resultCzk: numeric('result_czk', { precision: 18, scale: 4 }),
  raw: jsonb('raw'),
});

export const dividends = pgTable('dividends', {
  reference: text('reference').primaryKey(),
  ticker: text('ticker').notNull(),
  paidOn: timestamp('paid_on', { withTimezone: true }).notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 8 }),
  amountCzk: numeric('amount_czk', { precision: 18, scale: 4 }).notNull(),
  grossAmountCzk: numeric('gross_amount_czk', { precision: 18, scale: 4 }),
  taxWithheldCzk: numeric('tax_withheld_czk', { precision: 18, scale: 4 }),
  type: text('type'),
  raw: jsonb('raw'),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  dateTime: timestamp('date_time', { withTimezone: true }).notNull(),
  type: text('type').notNull(),
  amountCzk: numeric('amount_czk', { precision: 18, scale: 4 }).notNull(),
  reference: text('reference'),
  raw: jsonb('raw'),
});

export const syncRuns = pgTable('sync_runs', {
  id: serial('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: text('status').notNull(), // 'running' | 'ok' | 'error'
  error: text('error'),
  rowsAdded: jsonb('rows_added'),
  durationMs: integer('duration_ms'),
});

// Type exports for convenience.
export type Instrument = typeof instruments.$inferSelect;
export type PositionCurrent = typeof positionsCurrent.$inferSelect;
export type DailyPositionSnapshot = typeof dailyPositionSnapshots.$inferSelect;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type OrderHistory = typeof ordersHistory.$inferSelect;
export type Dividend = typeof dividends.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
