export type AssetClass = 'FOREX' | 'CRYPTO' | 'STOCKS' | 'INDICES' | 'COMMODITIES';
export type MarketDataProvider = 'TWELVE_DATA' | 'BINANCE';

export interface Instrument {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  provider: MarketDataProvider;
  baseCurrency: string;
  quoteCurrency: string;
  digits: number;
  minLot: number;
  lotStep: number;
  maxLot: number;
  contractSize: number;
  pipSize: number;
  defaultLeverage: number;
  popular?: boolean;
}

export interface MarketQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
  timestamp: number;
  provider: MarketDataProvider;
  isRealTime: boolean;
  isMarketOpen: boolean;
}

export interface CandleData {
  time: number; // Unix timestamp in seconds for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

export interface Order {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  price?: number;
  executed_price?: number;
  stop_loss?: number;
  take_profit?: number;
  margin_required: number;
  client_order_id?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface Position {
  id: string;
  user_id: string;
  account_id: string;
  order_id?: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entry_price: number;
  current_price: number;
  stop_loss?: number;
  take_profit?: number;
  unrealized_pnl: number;
  margin: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  updated_at?: string;
}

export interface Trade {
  id: string;
  user_id: string;
  account_id: string;
  position_id?: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entry_price: number;
  close_price: number;
  realized_pnl: number;
  commission: number;
  swap: number;
  opened_at: string;
  closed_at: string;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  account_number: string;
  account_type: 'DEMO' | 'CONTEST';
  currency: string;
  balance: number;
  equity: number;
  margin_used: number;
  free_margin: number;
  leverage: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  created_at: string;
}

export interface BalanceTransaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'INITIAL_DEPOSIT' | 'RESET_DEMO' | 'TRADE_REALIZED_PNL' | 'COMMISSION' | 'ADJUSTMENT';
  amount: number;
  balance_after: number;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_class: AssetClass;
  provider: MarketDataProvider;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  country?: string;
  preferred_currency?: string;
}
