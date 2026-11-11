import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from './index';
import {
  positionsCurrent,
  dividends,
  transactions,
  ordersHistory,
  portfolioSnapshots,
  dailyPositionSnapshots,
  syncRuns,
  instruments,
} from './schema';
import { fifoPair, type Order } from '@/lib/calc/fifo';

const n = (v: string | null | undefined): number => (v == null ? 0 : Number(v));

// -------- Overview / KPIs --------

export async function getLatestPortfolioSnapshot() {
  const rows = await db()
    .select()
    .from(portfolioSnapshots)
    .orderBy(desc(portfolioSnapshots.date))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPortfolioOverview() {
  const latest = await getLatestPortfolioSnapshot();
  const totalDiv = await db()
    .select({ s: sql<string>`coalesce(sum(${dividends.amountCzk}), 0)` })
    .from(dividends);
  const depositSum = await db()
    .select({ s: sql<string>`coalesce(sum(${transactions.amountCzk}), 0)` })
    .from(transactions)
    .where(eq(transactions.type, 'DEPOSIT'));

  const allOrders = await db()
    .select()
    .from(ordersHistory)
    .orderBy(asc(ordersHistory.filledAt));
  const fifoInput: Order[] = allOrders.map((o) => ({
    id: o.id,
    ticker: o.ticker,
    filledAt: o.filledAt,
    quantity: n(o.filledQuantity),
    price: n(o.fillPrice),
    side: o.side as 'BUY' | 'SELL',
  }));
  const { closedTrades } = fifoPair(fifoInput);
  const realizedPnl = closedTrades.reduce((sum, t) => sum + t.pnlCzk, 0);

  const totalDividends = n(totalDiv[0]?.s);
  const totalDeposits = n(depositSum[0]?.s);
  const totalValue = latest ? n(latest.totalValueCzk) : 0;
  const totalPpl = latest ? n(latest.totalPplCzk) : 0;
  const investedBase = totalDeposits || 1;

  return {
    asOf: latest?.date ?? null,
    totalValueCzk: totalValue,
    freeCashCzk: latest ? n(latest.freeCashCzk) : 0,
    investedCzk: latest ? n(latest.investedCzk) : 0,
    unrealizedPnlCzk: totalPpl,
    unrealizedPnlPct: latest ? (totalPpl / Math.max(1, n(latest.investedCzk))) * 100 : 0,
    realizedPnlCzk: realizedPnl,
    dividendsCzk: totalDividends,
    totalDepositsCzk: totalDeposits,
    totalReturnCzk: totalPpl + realizedPnl + totalDividends,
    totalReturnPct: ((totalPpl + realizedPnl + totalDividends) / investedBase) * 100,
    avgDividendYieldPct: (totalDividends / investedBase) * 100,
  };
}

// -------- Positions --------

export async function getOpenPositions() {
  const positions = await db().select().from(positionsCurrent);
  const instrs = await db().select().from(instruments);
  const instrMap = new Map(instrs.map((i) => [i.ticker, i]));
  const divs = await db().select().from(dividends);
  const divByTicker = new Map<string, number>();
  for (const d of divs) {
    divByTicker.set(d.ticker, (divByTicker.get(d.ticker) ?? 0) + n(d.amountCzk));
  }

  return positions.map((p) => {
    const qty = n(p.quantity);
    const avg = n(p.averagePrice);
    const cur = n(p.currentPrice);
    const cost = qty * avg;
    const value = qty * cur;
    const ppl = n(p.pplCzk);
    const divCzk = divByTicker.get(p.ticker) ?? 0;
    return {
      ticker: p.ticker,
      name: instrMap.get(p.ticker)?.name ?? null,
      nativeCurrency: instrMap.get(p.ticker)?.nativeCurrency ?? null,
      quantity: qty,
      averagePrice: avg,
      currentPrice: cur,
      costCzk: cost,
      valueCzk: value,
      pplCzk: ppl,
      pplPct: cost > 0 ? (ppl / cost) * 100 : 0,
      dividendsCzk: divCzk,
      dividendYieldPct: cost > 0 ? (divCzk / cost) * 100 : 0,
    };
  });
}

// -------- Closed trades (FIFO) --------

export async function getClosedTrades(opts: { since?: Date; ticker?: string; limit?: number } = {}) {
  const where = [];
  if (opts.ticker) where.push(eq(ordersHistory.ticker, opts.ticker));
  const all = await db()
    .select()
    .from(ordersHistory)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(ordersHistory.filledAt));

  const fifoInput: Order[] = all.map((o) => ({
    id: o.id,
    ticker: o.ticker,
    filledAt: o.filledAt,
    quantity: n(o.filledQuantity),
    price: n(o.fillPrice),
    side: o.side as 'BUY' | 'SELL',
  }));

  const { closedTrades } = fifoPair(fifoInput);

  // Attach dividends received during hold period, per trade.
  const divRows = await db().select().from(dividends);
  const divByTicker = new Map<string, typeof divRows>();
  for (const d of divRows) {
    const arr = divByTicker.get(d.ticker) ?? [];
    arr.push(d);
    divByTicker.set(d.ticker, arr);
  }

  let result = closedTrades.map((t) => {
    const divs = divByTicker.get(t.ticker) ?? [];
    const divDuringHold = divs
      .filter((d) => d.paidOn >= t.openDate && d.paidOn <= t.closeDate)
      .reduce((sum, d) => sum + n(d.amountCzk), 0);
    return { ...t, dividendsDuringHoldCzk: divDuringHold };
  });

  if (opts.since) result = result.filter((t) => t.closeDate >= opts.since!);
  result.sort((a, b) => b.closeDate.getTime() - a.closeDate.getTime());
  if (opts.limit) result = result.slice(0, opts.limit);

  return result;
}

// -------- Dividends --------

export async function getDividends(opts: { ticker?: string; from?: Date; to?: Date } = {}) {
  const where = [];
  if (opts.ticker) where.push(eq(dividends.ticker, opts.ticker));
  if (opts.from) where.push(gte(dividends.paidOn, opts.from));
  if (opts.to) where.push(lte(dividends.paidOn, opts.to));
  const rows = await db()
    .select()
    .from(dividends)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(dividends.paidOn));

  const total = rows.reduce((sum, d) => sum + n(d.amountCzk), 0);
  const byTicker = new Map<string, number>();
  for (const d of rows) byTicker.set(d.ticker, (byTicker.get(d.ticker) ?? 0) + n(d.amountCzk));

  return {
    rows: rows.map((d) => ({
      reference: d.reference,
      ticker: d.ticker,
      paidOn: d.paidOn,
      quantity: n(d.quantity),
      amountCzk: n(d.amountCzk),
      grossAmountCzk: n(d.grossAmountCzk),
      taxWithheldCzk: n(d.taxWithheldCzk),
      type: d.type,
    })),
    total,
    count: rows.length,
    average: rows.length ? total / rows.length : 0,
    byTicker: [...byTicker.entries()]
      .map(([ticker, amountCzk]) => ({ ticker, amountCzk }))
      .sort((a, b) => b.amountCzk - a.amountCzk),
  };
}

// -------- Cashflow --------

export async function getCashflow(opts: { from?: Date; to?: Date; type?: string } = {}) {
  const where = [];
  if (opts.type) where.push(eq(transactions.type, opts.type));
  if (opts.from) where.push(gte(transactions.dateTime, opts.from));
  if (opts.to) where.push(lte(transactions.dateTime, opts.to));
  const rows = await db()
    .select()
    .from(transactions)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(transactions.dateTime));

  return rows.map((t) => ({
    id: t.id,
    dateTime: t.dateTime,
    type: t.type,
    amountCzk: n(t.amountCzk),
    reference: t.reference,
  }));
}

// -------- Timeline --------

export async function getPortfolioTimeline(opts: { from?: Date; to?: Date } = {}) {
  const where = [];
  if (opts.from) where.push(gte(portfolioSnapshots.date, opts.from.toISOString().slice(0, 10)));
  if (opts.to) where.push(lte(portfolioSnapshots.date, opts.to.toISOString().slice(0, 10)));
  const snaps = await db()
    .select()
    .from(portfolioSnapshots)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(portfolioSnapshots.date));

  return snaps.map((s) => ({
    date: s.date,
    totalValueCzk: n(s.totalValueCzk),
    investedCzk: n(s.investedCzk),
    totalDepositsCzk: n(s.totalDepositsCzk),
    totalPplCzk: n(s.totalPplCzk),
    freeCashCzk: n(s.freeCashCzk),
  }));
}

// -------- Sync status --------

export async function getSyncStatus() {
  const rows = await db()
    .select()
    .from(syncRuns)
    .orderBy(desc(syncRuns.startedAt))
    .limit(10);
  const [counts] = await db()
    .select({
      orders: sql<number>`(select count(*) from ${ordersHistory})`,
      dividends: sql<number>`(select count(*) from ${dividends})`,
      transactions: sql<number>`(select count(*) from ${transactions})`,
      snapshots: sql<number>`(select count(*) from ${portfolioSnapshots})`,
    })
    .from(sql`(select 1) _`);

  return {
    latest: rows[0] ?? null,
    recent: rows,
    counts,
  };
}

// -------- Position series (for per-ticker charts) --------

export async function getPositionSeries(ticker: string, opts: { from?: Date; to?: Date } = {}) {
  const where = [eq(dailyPositionSnapshots.ticker, ticker)];
  if (opts.from) where.push(gte(dailyPositionSnapshots.date, opts.from.toISOString().slice(0, 10)));
  if (opts.to) where.push(lte(dailyPositionSnapshots.date, opts.to.toISOString().slice(0, 10)));
  const rows = await db()
    .select()
    .from(dailyPositionSnapshots)
    .where(and(...where))
    .orderBy(asc(dailyPositionSnapshots.date));

  return rows.map((r) => ({
    date: r.date,
    quantity: n(r.quantity),
    currentPrice: n(r.currentPrice),
    marketValueCzk: n(r.marketValueCzk),
    pplCzk: n(r.pplCzk),
  }));
}
