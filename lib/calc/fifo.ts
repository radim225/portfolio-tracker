export interface Order {
  id: string | number;
  ticker: string;
  filledAt: Date;
  quantity: number;   // always positive; use `side` to indicate direction
  price: number;      // per-share price in CZK
  side: 'BUY' | 'SELL';
}

export interface OpenLot {
  orderId: string | number;
  ticker: string;
  openDate: Date;
  quantity: number;
  price: number;
}

export interface ClosedTrade {
  ticker: string;
  openDate: Date;
  closeDate: Date;
  quantity: number;
  avgBuyPrice: number;
  sellPrice: number;
  costCzk: number;
  revenueCzk: number;
  pnlCzk: number;
  pnlPct: number;
  holdingDays: number;
}

export interface FifoResult {
  closedTrades: ClosedTrade[];
  openLots: OpenLot[];
}

export function fifoPair(orders: Order[]): FifoResult {
  // Sort ascending by date so we process buys/sells in chronological order.
  const sorted = [...orders].sort((a, b) => a.filledAt.getTime() - b.filledAt.getTime());

  // Per-ticker queue of open buy lots (FIFO).
  const queues = new Map<string, OpenLot[]>();
  const closedTrades: ClosedTrade[] = [];

  for (const order of sorted) {
    if (order.side === 'BUY') {
      const lot: OpenLot = {
        orderId: order.id,
        ticker: order.ticker,
        openDate: order.filledAt,
        quantity: order.quantity,
        price: order.price,
      };
      const q = queues.get(order.ticker) ?? [];
      q.push(lot);
      queues.set(order.ticker, q);
    } else {
      // SELL — consume from oldest lots first.
      let remaining = order.quantity;
      const q = queues.get(order.ticker) ?? [];

      while (remaining > 0 && q.length > 0) {
        const lot = q[0]!;
        const filled = Math.min(remaining, lot.quantity);
        const avgBuy = lot.price;
        const sell = order.price;
        const cost = filled * avgBuy;
        const revenue = filled * sell;
        const pnl = revenue - cost;

        closedTrades.push({
          ticker: order.ticker,
          openDate: lot.openDate,
          closeDate: order.filledAt,
          quantity: filled,
          avgBuyPrice: avgBuy,
          sellPrice: sell,
          costCzk: cost,
          revenueCzk: revenue,
          pnlCzk: pnl,
          pnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
          holdingDays: Math.round(
            (order.filledAt.getTime() - lot.openDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        });

        remaining -= filled;
        lot.quantity -= filled;
        if (lot.quantity <= 0) q.shift();
      }

      queues.set(order.ticker, q);
    }
  }

  // Collect remaining open lots across all tickers.
  const openLots: OpenLot[] = [];
  for (const q of queues.values()) {
    openLots.push(...q);
  }

  return { closedTrades, openLots };
}
