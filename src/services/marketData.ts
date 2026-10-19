import { CandleData, Instrument, MarketQuote, Timeframe } from '@/types';
import { getInstrumentBySymbol } from '@/lib/instruments';

// Cache for quotes to respect rate limits
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const quoteCache = new Map<string, CacheEntry<MarketQuote>>();
const candleCache = new Map<string, CacheEntry<CandleData[]>>();
const QUOTE_CACHE_TTL = 10000; // 10 seconds cache for Twelve Data quotes
const CANDLE_CACHE_TTL = 60000; // 1 minute cache for candles

// WebSocket management for Binance
let binanceWs: WebSocket | null = null;
const binanceSubscribers = new Set<(quote: MarketQuote) => void>();
const activeBinanceSymbols = new Set<string>();

export class MarketDataService {
  /**
   * Fetch current quote for an instrument
   */
  static async getQuote(symbol: string): Promise<MarketQuote> {
    const instrument = getInstrumentBySymbol(symbol);
    const provider = instrument?.provider || (symbol.includes('USDT') ? 'BINANCE' : 'TWELVE_DATA');

    // Check cache
    const cached = quoteCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) {
      return cached.data;
    }

    if (provider === 'BINANCE') {
      const quote = await this.fetchBinanceQuote(symbol);
      quoteCache.set(symbol, { data: quote, timestamp: Date.now() });
      return quote;
    } else {
      const quote = await this.fetchTwelveDataQuote(symbol);
      quoteCache.set(symbol, { data: quote, timestamp: Date.now() });
      return quote;
    }
  }

  /**
   * Fetch historical candles for chart rendering
   */
  static async getCandles(symbol: string, timeframe: Timeframe = '1h'): Promise<CandleData[]> {
    const cacheKey = `${symbol}_${timeframe}`;
    const cached = candleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CANDLE_CACHE_TTL) {
      return cached.data;
    }

    const instrument = getInstrumentBySymbol(symbol);
    const provider = instrument?.provider || (symbol.includes('USDT') ? 'BINANCE' : 'TWELVE_DATA');

    let candles: CandleData[] = [];
    if (provider === 'BINANCE') {
      candles = await this.fetchBinanceCandles(symbol, timeframe);
    } else {
      candles = await this.fetchTwelveDataCandles(symbol, timeframe);
    }

    if (candles.length > 0) {
      candleCache.set(cacheKey, { data: candles, timestamp: Date.now() });
    }
    return candles;
  }

  /**
   * Binance 24hr Ticker API (Public, direct frontend call)
   */
  private static async fetchBinanceQuote(symbol: string): Promise<MarketQuote> {
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
      if (!res.ok) {
        throw new Error(`Binance HTTP ${res.status}: ${res.statusText}`);
      }
      const d = await res.json();

      const lastPrice = parseFloat(d.lastPrice);
      const bid = parseFloat(d.bidPrice) || lastPrice;
      const ask = parseFloat(d.askPrice) || lastPrice;
      const spread = parseFloat((ask - bid).toFixed(4));
      const change24h = parseFloat(d.priceChange);
      const changePercent24h = parseFloat(d.priceChangePercent);

      return {
        symbol,
        price: lastPrice,
        bid,
        ask,
        spread,
        high24h: parseFloat(d.highPrice),
        low24h: parseFloat(d.lowPrice),
        volume24h: parseFloat(d.volume),
        change24h,
        changePercent24h,
        timestamp: d.closeTime || Date.now(),
        provider: 'BINANCE',
        isRealTime: true,
        isMarketOpen: true,
      };
    } catch (err: any) {
      console.warn(`[Binance] Failed to fetch quote for ${symbol}:`, err.message);
      // Return fallback cached or synthesized quote if available
      return this.getFallbackQuote(symbol, 'BINANCE');
    }
  }

  /**
   * Binance Klines API (Public, direct frontend call)
   */
  private static async fetchBinanceCandles(symbol: string, timeframe: Timeframe): Promise<CandleData[]> {
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    const intervalMap: Record<Timeframe, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };
    const interval = intervalMap[timeframe] || '1h';

    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=120`
      );
      if (!res.ok) {
        throw new Error(`Binance Klines error ${res.status}`);
      }
      const rawData = await res.json();
      return rawData.map((k: any) => ({
        time: Math.floor(k[0] / 1000), // convert ms to seconds
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch (err: any) {
      console.warn(`[Binance] Failed to fetch candles for ${symbol}:`, err.message);
      return [];
    }
  }

  /**
   * Twelve Data Quote via serverless proxy (/api/twelve-data)
   */
  private static async fetchTwelveDataQuote(symbol: string): Promise<MarketQuote> {
    try {
      const res = await fetch(`/api/twelve-data?endpoint=quote&symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        throw new Error(`Twelve Data proxy error: ${res.status}`);
      }
      const data = await res.json();

      if (data.code || data.status === 'error') {
        throw new Error(data.message || 'Twelve Data error');
      }

      const closePrice = parseFloat(data.close);
      const isMarketOpen = Boolean(data.is_market_open);
      const spread = 0.00015; // standard tight institutional spread for forex
      const bid = parseFloat((closePrice - spread / 2).toFixed(5));
      const ask = parseFloat((closePrice + spread / 2).toFixed(5));

      return {
        symbol: data.symbol || symbol,
        price: closePrice,
        bid,
        ask,
        spread,
        high24h: parseFloat(data.high) || closePrice,
        low24h: parseFloat(data.low) || closePrice,
        volume24h: parseFloat(data.volume) || 0,
        change24h: parseFloat(data.change) || 0,
        changePercent24h: parseFloat(data.percent_change) || 0,
        timestamp: data.timestamp ? data.timestamp * 1000 : Date.now(),
        provider: 'TWELVE_DATA',
        isRealTime: isMarketOpen,
        isMarketOpen,
      };
    } catch (err: any) {
      console.warn(`[TwelveData] Failed to fetch quote for ${symbol}:`, err.message);
      return this.getFallbackQuote(symbol, 'TWELVE_DATA');
    }
  }

  /**
   * Twelve Data Time Series via serverless proxy
   */
  private static async fetchTwelveDataCandles(symbol: string, timeframe: Timeframe): Promise<CandleData[]> {
    const intervalMap: Record<Timeframe, string> = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '1h': '1h',
      '4h': '4h',
      '1d': '1day',
    };
    const interval = intervalMap[timeframe] || '1h';

    try {
      const res = await fetch(
        `/api/twelve-data?endpoint=time_series&symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=100`
      );
      if (!res.ok) {
        throw new Error(`Twelve Data proxy error: ${res.status}`);
      }
      const data = await res.json();

      if (!data.values || !Array.isArray(data.values)) {
        throw new Error(data.message || 'No candle values returned');
      }

      // Twelve data returns reverse chronological order (newest first). Lightweight charts requires chronological order.
      const candles: CandleData[] = data.values
        .map((item: any) => {
          // Parse datetime (e.g. "2026-10-19 14:00:00")
          const timeSec = Math.floor(new Date(item.datetime).getTime() / 1000);
          return {
            time: isNaN(timeSec) ? Math.floor(Date.now() / 1000) : timeSec,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseFloat(item.volume) || 0,
          };
        })
        .filter((c: CandleData) => !isNaN(c.time) && !isNaN(c.close))
        .sort((a: CandleData, b: CandleData) => a.time - b.time);

      return candles;
    } catch (err: any) {
      console.warn(`[TwelveData] Failed to fetch candles for ${symbol}:`, err.message);
      return [];
    }
  }

  /**
   * Real-time WebSocket Stream for Binance Crypto
   */
  static subscribeBinanceStream(symbol: string, onQuote: (quote: MarketQuote) => void) {
    const cleanSymbol = symbol.replace('/', '').toLowerCase();
    activeBinanceSymbols.add(cleanSymbol);
    binanceSubscribers.add(onQuote);

    if (!binanceWs || binanceWs.readyState === WebSocket.CLOSED) {
      this.initBinanceWs();
    }

    return () => {
      binanceSubscribers.delete(onQuote);
      if (binanceSubscribers.size === 0 && binanceWs) {
        binanceWs.close();
        binanceWs = null;
      }
    };
  }

  private static initBinanceWs() {
    try {
      const streams = Array.from(activeBinanceSymbols).map((s) => `${s}@ticker`).join('/');
      if (!streams) return;

      binanceWs = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

      binanceWs.onmessage = (event) => {
        try {
          const d = JSON.parse(event.data);
          if (d && d.s && d.c) {
            const lastPrice = parseFloat(d.c);
            const bid = parseFloat(d.b) || lastPrice;
            const ask = parseFloat(d.a) || lastPrice;
            const quote: MarketQuote = {
              symbol: d.s,
              price: lastPrice,
              bid,
              ask,
              spread: parseFloat((ask - bid).toFixed(4)),
              high24h: parseFloat(d.h),
              low24h: parseFloat(d.l),
              volume24h: parseFloat(d.v),
              change24h: parseFloat(d.p),
              changePercent24h: parseFloat(d.P),
              timestamp: d.E || Date.now(),
              provider: 'BINANCE',
              isRealTime: true,
              isMarketOpen: true,
            };
            quoteCache.set(d.s, { data: quote, timestamp: Date.now() });
            binanceSubscribers.forEach((cb) => cb(quote));
          }
        } catch (e) {
          // ignore stream parse errors
        }
      };

      binanceWs.onerror = () => {
        // Automatically reconnect after 5s
        setTimeout(() => {
          if (binanceSubscribers.size > 0) this.initBinanceWs();
        }, 5000);
      };
    } catch (e) {
      console.warn('Failed to start Binance WebSocket stream', e);
    }
  }

  /**
   * Deterministic baseline quote when external rate limits occur
   */
  private static getFallbackQuote(symbol: string, provider: 'TWELVE_DATA' | 'BINANCE'): MarketQuote {
    // Known base values for graceful degradation
    const baselineMap: Record<string, number> = {
      'EUR/USD': 1.1226,
      'GBP/USD': 1.3145,
      'USD/JPY': 152.40,
      'AUD/USD': 0.6680,
      'USD/CAD': 1.3820,
      'USD/CHF': 0.8650,
      'BTCUSDT': 82350.00,
      'ETHUSDT': 2850.00,
      'SOLUSDT': 185.00,
      'AAPL': 234.50,
      'TSLA': 220.80,
      'NVDA': 141.20,
      'MSFT': 428.00,
      'AMZN': 188.50,
      'XAU/USD': 2720.50,
      'SPX': 5860.00,
    };

    const base = baselineMap[symbol] || 100.0;
    const spread = base * 0.0002;
    return {
      symbol,
      price: base,
      bid: base - spread / 2,
      ask: base + spread / 2,
      spread,
      high24h: base * 1.015,
      low24h: base * 0.985,
      volume24h: 1250000,
      change24h: base * 0.004,
      changePercent24h: 0.4,
      timestamp: Date.now(),
      provider,
      isRealTime: false,
      isMarketOpen: false,
    };
  }
}
