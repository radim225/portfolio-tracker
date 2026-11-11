import type { ClosedTrade } from './fifo';

export interface ClosedTradeStats {
  totalPnlCzk: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  avgPnlCzk: number;
  avgHoldingDays: number;
  bestTrade: ClosedTrade | null;
  worstTrade: ClosedTrade | null;
}

export function calcClosedTradeStats(trades: ClosedTrade[]): ClosedTradeStats {
  if (trades.length === 0) {
    return {
      totalPnlCzk: 0,
      winCount: 0,
      lossCount: 0,
      winRatePct: 0,
      avgPnlCzk: 0,
      avgHoldingDays: 0,
      bestTrade: null,
      worstTrade: null,
    };
  }
  const wins = trades.filter((t) => t.pnlCzk > 0);
  const total = trades.reduce((s, t) => s + t.pnlCzk, 0);
  const sorted = [...trades].sort((a, b) => b.pnlCzk - a.pnlCzk);
  return {
    totalPnlCzk: total,
    winCount: wins.length,
    lossCount: trades.length - wins.length,
    winRatePct: (wins.length / trades.length) * 100,
    avgPnlCzk: total / trades.length,
    avgHoldingDays: trades.reduce((s, t) => s + t.holdingDays, 0) / trades.length,
    bestTrade: sorted[0] ?? null,
    worstTrade: sorted[sorted.length - 1] ?? null,
  };
}

export function calcDividendYield(dividendsCzk: number, costCzk: number): number {
  return costCzk > 0 ? (dividendsCzk / costCzk) * 100 : 0;
}

export function calcTotalReturn(
  unrealizedPnl: number,
  realizedPnl: number,
  dividends: number,
  totalDeposits: number,
): { czk: number; pct: number } {
  const czk = unrealizedPnl + realizedPnl + dividends;
  return { czk, pct: totalDeposits > 0 ? (czk / totalDeposits) * 100 : 0 };
}
