// Trading 212 public API response types.
// All monetary fields are in the account's primary currency (CZK for this project).

export interface Paginated<T> {
  items: T[];
  nextPagePath: string | null;
}

// Actual shape returned by GET /equity/account/summary
export interface AccountSummary {
  id: number;
  currency: string;
  totalValue: number; // total account value
  cash: {
    availableToTrade: number;
    reservedForOrders: number;
    inPies: number;
  };
  investments: {
    currentValue: number;
    totalCost: number;
    realizedProfitLoss: number;
    unrealizedProfitLoss: number;
  };
}

// Actual shape returned by GET /equity/positions. Prices are in the
// instrument's native currency; account-currency values live in walletImpact.
export interface Position {
  instrument: {
    ticker: string;
    name: string;
    isin: string;
    currency: string;
  };
  createdAt: string;
  quantity: number;
  quantityAvailableForTrading?: number;
  quantityInPies?: number;
  currentPrice: number;      // native instrument currency
  averagePricePaid: number;  // native instrument currency
  walletImpact: {
    currency: string;
    totalCost: number;
    currentValue: number;
    unrealizedProfitLoss: number;
    fxImpact?: number;
  };
}

export type OrderType = 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_LIMIT';
export type OrderStatus = 'FILLED' | 'CANCELLED' | 'REJECTED';

// Actual shape returned by GET /equity/history/orders
export interface HistoricalOrder {
  order: {
    id: number;
    type: OrderType;
    ticker: string;
    status: OrderStatus;
    value?: number;
    filledValue?: number;
    currency: string;
    side: 'BUY' | 'SELL';
    createdAt: string;
    instrument?: {
      ticker: string;
      name: string;
      isin: string;
      currency: string;
    };
  };
  fill: {
    id: number;
    quantity: number;
    price: number;
    filledAt: string;
    walletImpact?: {
      currency: string;
      netValue: number;
      fxRate?: number;
      taxes?: Array<{ name: string; quantity: number; currency: string; chargedAt: string }>;
    };
  };
}

export interface Dividend {
  reference: string;
  ticker: string;
  instrument?: {
    ticker: string;
    name: string;
    isin: string;
    currency: string;
  };
  quantity: number;
  currency: string;
  grossAmountPerShare: number;
  amountInEuro?: number;
  tickerCurrency?: string;
  // Older/API-export shapes may include account-currency totals, but the
  // public history endpoint currently does not.
  totalGrossAmount?: number;
  totalTaxWithheld?: number;
  paidOn: string; // ISO timestamp
  amount: number; // net, in account currency
  type: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'INTEREST_ON_CASH'
  | 'CASHBACK'
  | 'DIVIDEND'
  | 'FEE'
  | 'CURRENCY_CONVERSION';

export interface Transaction {
  reference: string;
  dateTime: string; // ISO timestamp
  type: TransactionType | string;
  amount: number;  // in account currency
}

export interface Instrument {
  ticker: string;
  name: string;
  shortName?: string;
  currencyCode: string;
  type: string;
  isin?: string;
  exchange?: string;
  addedOn?: string;
  minTradeQuantity?: number;
  maxOpenQuantity?: number;
}
