import 'dotenv/config';
import { dbPool } from '@/lib/db';
import { syncRuns, ordersHistory, dividends, transactions } from '@/lib/db/schema';
import {
  getAccountSummary,
  getPositions,
  getAllOrders,
  getAllDividends,
  getAllTransactions,
} from '@/lib/t212/endpoints';
import { fetchTail } from '@/lib/t212/paginate';
import { saveAccountSnapshot, savePositions } from './snapshots';
import { sql } from 'drizzle-orm';
import type { HistoricalOrder, Dividend, Transaction } from '@/lib/t212/types';

// Gap between pagination requests on rate-limited endpoints (6 req/min → 10s/req safe).
const HISTORY_DELAY_MS = 10_500;

const optionalNumeric = (value: number | null | undefined): string | null =>
  value == null ? null : String(value);

export async function runDailySync(dryRun = false): Promise<void> {
  const db = dbPool();
  const startedAt = new Date();
  let runId: number | null = null;

  if (!dryRun) {
    const [run] = await db
      .insert(syncRuns)
      .values({ startedAt, status: 'running' })
      .returning({ id: syncRuns.id });
    runId = run?.id ?? null;
  }

  const rowsAdded: Record<string, number> = {};

  try {
    console.log('[sync] Fetching account summary…');
    const summary = await getAccountSummary();

    console.log('[sync] Fetching open positions…');
    const positions = await getPositions();

    if (!dryRun) {
      await savePositions(positions);
    }
    console.log(`[sync] ${positions.length} positions saved.`);

    // Tail-fetch history — stop once we hit an already-stored id.
    const [existingOrderIds, existingDivRefs, existingTxIds] = await Promise.all([
      db.select({ id: ordersHistory.id }).from(ordersHistory),
      db.select({ id: dividends.reference }).from(dividends),
      db.select({ id: transactions.id }).from(transactions),
    ]);
    const knownOrders = new Set(existingOrderIds.map((r) => r.id));
    const knownDivs = new Set(existingDivRefs.map((r) => r.id));
    const knownTxs = new Set(existingTxIds.map((r) => r.id));

    console.log('[sync] Tail-fetching new orders…');
    const newOrders = await fetchTail<HistoricalOrder>(
      '/equity/history/orders',
      knownOrders,
      { delayMs: HISTORY_DELAY_MS, idExtractor: (o) => o.order.id },
    );
    rowsAdded.orders = newOrders.length;

    console.log('[sync] Tail-fetching new dividends…');
    const newDivs = await fetchTail<Dividend>(
      '/equity/history/dividends',
      knownDivs,
      { delayMs: HISTORY_DELAY_MS, idExtractor: (d) => d.reference },
    );
    rowsAdded.dividends = newDivs.length;

    console.log('[sync] Tail-fetching new transactions…');
    const newTxs = await fetchTail<Transaction>(
      '/equity/history/transactions',
      knownTxs,
      { delayMs: HISTORY_DELAY_MS, idExtractor: (t) => t.reference },
    );
    rowsAdded.transactions = newTxs.length;

    if (!dryRun) {
      await insertOrders(newOrders);
      await insertDividends(newDivs);
      await insertTransactions(newTxs);
    }

    // Total deposits = sum of DEPOSIT transactions — computed after the
    // inserts above so today's snapshot includes today's deposits.
    const [depRow] = await db
      .select({ s: sql<string>`coalesce(sum(${transactions.amountCzk}), 0)` })
      .from(transactions)
      .where(sql`type = 'DEPOSIT'`);
    const totalDeposits = Number(depRow?.s ?? 0);

    if (!dryRun) {
      await saveAccountSnapshot(summary, totalDeposits);
    }

    console.log(
      `[sync] Done. orders+${rowsAdded.orders} divs+${rowsAdded.dividends} txs+${rowsAdded.transactions}`,
    );

    if (!dryRun && runId) {
      await db
        .update(syncRuns)
        .set({
          finishedAt: new Date(),
          status: 'ok',
          rowsAdded,
          durationMs: Date.now() - startedAt.getTime(),
        })
        .where(sql`id = ${runId}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] Failed:', message);
    if (!dryRun && runId) {
      await db
        .update(syncRuns)
        .set({ finishedAt: new Date(), status: 'error', error: message })
        .where(sql`id = ${runId}`);
    }
    throw err;
  }
}

async function insertOrders(orders: HistoricalOrder[]): Promise<void> {
  if (orders.length === 0) return;
  const db = dbPool();
  const rows = orders
    .filter((o) => o.order.status === 'FILLED' && o.fill?.filledAt && o.fill?.price && o.fill?.quantity)
    .map((o) => ({
      id: String(o.order.id),
      ticker: o.order.ticker,
      filledAt: new Date(o.fill.filledAt),
      filledQuantity: String(Math.abs(o.fill.quantity)),
      fillPrice: String(o.fill.price),
      type: o.order.type,
      side: o.order.side,
      resultCzk: o.fill.walletImpact?.netValue != null ? String(o.fill.walletImpact.netValue) : null,
      raw: o,
    }));
  if (rows.length === 0) return;
  await db
    .insert(ordersHistory)
    .values(rows)
    .onConflictDoNothing({ target: ordersHistory.id });
}

async function insertDividends(divs: Dividend[]): Promise<void> {
  if (divs.length === 0) return;
  const db = dbPool();
  await db
    .insert(dividends)
    .values(
      divs.map((d) => ({
        reference: d.reference,
        ticker: d.ticker,
        paidOn: new Date(d.paidOn),
        quantity: String(d.quantity),
        amountCzk: String(d.amount),
        grossAmountCzk: optionalNumeric(d.totalGrossAmount),
        taxWithheldCzk: optionalNumeric(d.totalTaxWithheld),
        type: d.type,
        raw: d,
      })),
    )
    .onConflictDoNothing({ target: dividends.reference });
}

async function insertTransactions(txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return;
  const db = dbPool();
  await db
    .insert(transactions)
    .values(
      txs.map((t) => ({
        id: t.reference,
        dateTime: new Date(t.dateTime),
        type: t.type,
        amountCzk: String(t.amount),
        reference: t.reference,
        raw: t,
      })),
    )
    .onConflictDoNothing({ target: transactions.id });
}
