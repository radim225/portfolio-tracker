import { eq, sql } from 'drizzle-orm';
import { dbPool } from '@/lib/db';
import {
  portfolioSnapshots,
  dailyPositionSnapshots,
  positionsCurrent,
  instruments,
} from '@/lib/db/schema';
import type { AccountSummary, Position, Instrument } from '@/lib/t212/types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function saveAccountSnapshot(
  summary: AccountSummary,
  totalDeposits: number,
  date = todayIso(),
): Promise<void> {
  const db = dbPool();
  const freeCash =
    summary.cash.availableToTrade + summary.cash.reservedForOrders + summary.cash.inPies;
  await db
    .insert(portfolioSnapshots)
    .values({
      date,
      totalValueCzk: String(summary.totalValue),
      freeCashCzk: String(freeCash),
      investedCzk: String(summary.investments.totalCost),
      totalPplCzk: String(summary.investments.unrealizedProfitLoss),
      totalDepositsCzk: String(totalDeposits),
    })
    .onConflictDoUpdate({
      target: portfolioSnapshots.date,
      set: {
        totalValueCzk: sql`excluded.total_value_czk`,
        freeCashCzk: sql`excluded.free_cash_czk`,
        investedCzk: sql`excluded.invested_czk`,
        totalPplCzk: sql`excluded.total_ppl_czk`,
        totalDepositsCzk: sql`excluded.total_deposits_czk`,
      },
    });
}

export async function savePositions(
  positions: Position[],
  date = todayIso(),
): Promise<void> {
  const db = dbPool();
  if (positions.length === 0) return;

  // The API reports prices in the instrument's native currency; the dashboard
  // expects CZK everywhere, so derive CZK-per-share prices from walletImpact.
  const czkAvgPrice = (p: Position) =>
    p.quantity ? p.walletImpact.totalCost / p.quantity : 0;
  const czkCurPrice = (p: Position) =>
    p.quantity ? p.walletImpact.currentValue / p.quantity : 0;

  // Overwrite positions_current completely.
  await db.delete(positionsCurrent);
  if (positions.length > 0) {
    await db.insert(positionsCurrent).values(
      positions.map((p) => ({
        ticker: p.instrument.ticker,
        quantity: String(p.quantity),
        averagePrice: String(czkAvgPrice(p)),
        currentPrice: String(czkCurPrice(p)),
        pplCzk: String(p.walletImpact.unrealizedProfitLoss),
        fxPplCzk: p.walletImpact.fxImpact != null ? String(p.walletImpact.fxImpact) : null,
        initialFillDate: p.createdAt ? new Date(p.createdAt) : null,
      })),
    );
  }

  // Upsert daily snapshot.
  await db
    .insert(dailyPositionSnapshots)
    .values(
      positions.map((p) => ({
        date,
        ticker: p.instrument.ticker,
        quantity: String(p.quantity),
        currentPrice: String(czkCurPrice(p)),
        marketValueCzk: String(p.walletImpact.currentValue),
        pplCzk: String(p.walletImpact.unrealizedProfitLoss),
      })),
    )
    .onConflictDoUpdate({
      target: [dailyPositionSnapshots.date, dailyPositionSnapshots.ticker],
      set: {
        quantity: sql`excluded.quantity`,
        currentPrice: sql`excluded.current_price`,
        marketValueCzk: sql`excluded.market_value_czk`,
        pplCzk: sql`excluded.ppl_czk`,
      },
    });
}

export async function saveInstruments(instrs: Instrument[]): Promise<void> {
  const db = dbPool();
  if (instrs.length === 0) return;
  await db
    .insert(instruments)
    .values(
      instrs.map((i) => ({
        ticker: i.ticker,
        name: i.name,
        nativeCurrency: i.currencyCode,
        type: i.type,
        isin: i.isin ?? null,
        exchange: i.exchange ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: instruments.ticker,
      set: {
        name: sql`excluded.name`,
        nativeCurrency: sql`excluded.native_currency`,
        type: sql`excluded.type`,
        isin: sql`excluded.isin`,
        exchange: sql`excluded.exchange`,
        updatedAt: sql`now()`,
      },
    });
}
