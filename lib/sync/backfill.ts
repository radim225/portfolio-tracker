import 'dotenv/config';
import { dbPool } from '@/lib/db';
import { ordersHistory, dividends, transactions, instruments } from '@/lib/db/schema';
import {
  getAllOrders,
  getAllDividends,
  getAllTransactions,
  getInstruments,
} from '@/lib/t212/endpoints';
import { saveInstruments } from './snapshots';
import type { HistoricalOrder, Dividend, Transaction } from '@/lib/t212/types';

// Full history backfill — runs once, paces to 6 req/min on history endpoints.
// Use pnpm backfill. Can be safely re-run; already-stored rows are skipped.

// 10.5s between each pagination request → ~5.7 req/min, safely under the 6 req/min limit.
const DELAY_MS = 10_500;

const optionalNumeric = (value: number | null | undefined): string | null =>
  value == null ? null : String(value);

export async function runBackfill(): Promise<void> {
  const db = dbPool();
  console.log('[backfill] Starting full history backfill…');
  console.log('[backfill] This may take 30–60 minutes depending on account history size.');

  // 1. Instruments (fast, 1 req / 50s — but it returns everything in one page)
  console.log('[backfill] Fetching instruments…');
  const instrs = await getInstruments();
  await saveInstruments(instrs);
  console.log(`[backfill] ${instrs.length} instruments saved.`);

  // 2. Orders (6 req/min, newest first)
  console.log('[backfill] Fetching full order history (this takes a while)…');
  const orders = await getAllOrders(DELAY_MS);
  console.log(`[backfill] ${orders.length} orders fetched — inserting…`);
  await insertAllOrders(orders);

  // 3. Dividends
  console.log('[backfill] Fetching full dividend history…');
  const divs = await getAllDividends(DELAY_MS);
  console.log(`[backfill] ${divs.length} dividends fetched — inserting…`);
  await insertAllDividends(divs);

  // 4. Transactions
  console.log('[backfill] Fetching full transaction history…');
  const txs = await getAllTransactions(DELAY_MS);
  console.log(`[backfill] ${txs.length} transactions fetched — inserting…`);
  await insertAllTransactions(txs);

  console.log('[backfill] Complete.');
}

async function insertAllOrders(orders: HistoricalOrder[]): Promise<void> {
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
  // Insert in batches to avoid parameter limit.
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(ordersHistory)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoNothing({ target: ordersHistory.id });
    process.stdout.write(`\r[backfill] Orders: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log();
}

async function insertAllDividends(divs: Dividend[]): Promise<void> {
  const db = dbPool();
  if (divs.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < divs.length; i += BATCH) {
    await db
      .insert(dividends)
      .values(
        divs.slice(i, i + BATCH).map((d) => ({
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
    process.stdout.write(`\r[backfill] Dividends: ${Math.min(i + BATCH, divs.length)}/${divs.length}`);
  }
  console.log();
}

async function insertAllTransactions(txs: Transaction[]): Promise<void> {
  const db = dbPool();
  if (txs.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < txs.length; i += BATCH) {
    await db
      .insert(transactions)
      .values(
        txs.slice(i, i + BATCH).map((t) => ({
          id: t.reference,
          dateTime: new Date(t.dateTime),
          type: t.type,
          amountCzk: String(t.amount),
          reference: t.reference,
          raw: t,
        })),
      )
      .onConflictDoNothing({ target: transactions.id });
    process.stdout.write(`\r[backfill] Transactions: ${Math.min(i + BATCH, txs.length)}/${txs.length}`);
  }
  console.log();
}
