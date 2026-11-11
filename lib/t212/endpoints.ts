import { t212Json } from './client';
import { fetchAll } from './paginate';
import type {
  AccountSummary,
  Dividend,
  HistoricalOrder,
  Instrument,
  Position,
  Transaction,
} from './types';

export const getAccountSummary = () =>
  t212Json<AccountSummary>('/equity/account/summary');

export const getPositions = () =>
  t212Json<Position[]>('/equity/positions');

export const getInstruments = () =>
  fetchAll<Instrument>('/equity/metadata/instruments');

export const getAllOrders = (delayMs = 0) =>
  fetchAll<HistoricalOrder>('/equity/history/orders', { delayMs });

export const getAllDividends = (delayMs = 0) =>
  fetchAll<Dividend>('/equity/history/dividends', { delayMs });

export const getAllTransactions = (delayMs = 0) =>
  fetchAll<Transaction>('/equity/history/transactions', { delayMs });
