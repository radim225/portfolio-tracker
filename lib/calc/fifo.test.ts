import { describe, expect, it } from 'vitest';
import { fifoPair, type Order } from './fifo';

const d = (offset: number) => new Date(Date.UTC(2024, 0, 1 + offset));
const buy = (id: number, qty: number, price: number, day: number, ticker = 'AAPL'): Order => ({
  id,
  ticker,
  filledAt: d(day),
  quantity: qty,
  price,
  side: 'BUY',
});
const sell = (id: number, qty: number, price: number, day: number, ticker = 'AAPL'): Order => ({
  id,
  ticker,
  filledAt: d(day),
  quantity: qty,
  price,
  side: 'SELL',
});

// ------- Scenario 1: Simple 1:1 buy → sell -------
describe('simple buy → sell', () => {
  it('produces one closed trade with correct P&L and hold days', () => {
    const orders = [buy(1, 10, 100, 0), sell(2, 10, 120, 5)];
    const { closedTrades, openLots } = fifoPair(orders);

    expect(closedTrades).toHaveLength(1);
    expect(openLots).toHaveLength(0);

    const t = closedTrades[0]!;
    expect(t.ticker).toBe('AAPL');
    expect(t.quantity).toBe(10);
    expect(t.avgBuyPrice).toBe(100);
    expect(t.sellPrice).toBe(120);
    expect(t.costCzk).toBeCloseTo(1000);
    expect(t.revenueCzk).toBeCloseTo(1200);
    expect(t.pnlCzk).toBeCloseTo(200);
    expect(t.pnlPct).toBeCloseTo(20);
    expect(t.holdingDays).toBe(5);
  });
});

// ------- Scenario 2: Partial sell (lot remains open) -------
describe('partial sell', () => {
  it('closes only the sold portion; remaining quantity stays in open lots', () => {
    const orders = [buy(1, 10, 100, 0), sell(2, 4, 150, 10)];
    const { closedTrades, openLots } = fifoPair(orders);

    expect(closedTrades).toHaveLength(1);
    const t = closedTrades[0]!;
    expect(t.quantity).toBe(4);
    expect(t.pnlCzk).toBeCloseTo(200); // 4 × (150 − 100)

    expect(openLots).toHaveLength(1);
    expect(openLots[0]!.quantity).toBe(6);
    expect(openLots[0]!.price).toBe(100);
  });
});

// ------- Scenario 3: Multiple buys, sell within the oldest lot -------
describe('multiple buys → sell within oldest lot', () => {
  it('consumes from the oldest lot first; newer lots stay open', () => {
    const orders = [
      buy(1, 5, 100, 0),  // oldest lot
      buy(2, 5, 110, 3),  // newer lot
      sell(3, 3, 130, 7), // sells 3 from lot 1
    ];
    const { closedTrades, openLots } = fifoPair(orders);

    expect(closedTrades).toHaveLength(1);
    const t = closedTrades[0]!;
    expect(t.avgBuyPrice).toBe(100); // from oldest lot
    expect(t.quantity).toBe(3);
    expect(t.pnlCzk).toBeCloseTo(90); // 3 × (130 − 100)

    expect(openLots).toHaveLength(2);
    expect(openLots[0]!.quantity).toBe(2);  // 5 − 3 from lot 1
    expect(openLots[1]!.quantity).toBe(5);  // lot 2 untouched
  });
});

// ------- Scenario 4: Cross-lot sell -------
describe('cross-lot sell', () => {
  it('spills into the next lot and produces two closed trade rows', () => {
    const orders = [
      buy(1, 3, 100, 0),  // lot 1: 3 shares @ 100
      buy(2, 5, 120, 2),  // lot 2: 5 shares @ 120
      sell(3, 5, 200, 8), // sell 5 — exhausts lot 1 (3) and takes 2 from lot 2
    ];
    const { closedTrades, openLots } = fifoPair(orders);

    expect(closedTrades).toHaveLength(2);

    // First trade: from lot 1
    const t1 = closedTrades[0]!;
    expect(t1.avgBuyPrice).toBe(100);
    expect(t1.quantity).toBe(3);
    expect(t1.pnlCzk).toBeCloseTo(300); // 3 × (200 − 100)

    // Second trade: from lot 2
    const t2 = closedTrades[1]!;
    expect(t2.avgBuyPrice).toBe(120);
    expect(t2.quantity).toBe(2);
    expect(t2.pnlCzk).toBeCloseTo(160); // 2 × (200 − 120)

    // Remaining: 3 from lot 2
    expect(openLots).toHaveLength(1);
    expect(openLots[0]!.quantity).toBe(3);
    expect(openLots[0]!.price).toBe(120);
  });
});
