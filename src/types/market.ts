export interface TradingPair {
  exchange: string;
  baseAsset: string;
  quoteAsset: string;
  symbol: string;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  count?: number;
}

export interface Trade {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface MarketSummaryData {
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export interface ExchangeInfo {
  id: string;
  name: string;
  logo: string;
  pairs: TradingPair[];
}

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w'; 