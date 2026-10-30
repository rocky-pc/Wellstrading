import { CandleData, Instrument, MarketQuote, Timeframe, MarketTrend } from '@/types';
import { DEFAULT_INSTRUMENTS, getInstrumentBySymbol, setInstruments, INSTRUMENTS } from '@/lib/instruments';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Local storage key for fallback / offline sync
const STORAGE_INSTRUMENTS_KEY = 'wellstrading_algorithmic_instruments';
const SYNC_CHANNEL_NAME = 'wellstrading_market_sync_bus';

// Fast deterministic integer hash for PRNG
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pseudoRandom(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export class MarketDataService {
  private static instrumentsMap: Map<string, Instrument> = new Map();
  private static subscribers: Map<string, Set<(quote: MarketQuote) => void>> = new Map();
  private static allSubscribers: Set<(quotes: Record<string, MarketQuote>) => void> = new Set();
  private static tickInterval: any = null;
  private static broadcastChannel: BroadcastChannel | null = null;
  private static isInitialized = false;

  /**
   * Initialize the market engine, load instruments from Supabase/storage, and start 1-sec tick loop
   */
  static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Load initial instruments
    this.loadInitialInstruments();

    // 2. Setup cross-tab sync channel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'INSTRUMENTS_UPDATED') {
            this.handleRemoteInstrumentsUpdate(event.data.instruments, false);
          }
        };
      }
    } catch {
      // ignore
    }

    // 3. Setup Supabase Realtime subscription if available
    this.setupSupabaseSubscription();

    // 4. Start 1-second (low-latency) deterministic tick loop
    this.startTickLoop();
  }

  /**
   * Load instruments: first check Supabase, then localStorage, fallback to DEFAULT_INSTRUMENTS
   */
  private static async loadInitialInstruments() {
    let loaded: Instrument[] = [];

    // Attempt Supabase fetch
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('market_instruments')
          .select('*')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          loaded = data.map((d: any) => ({
            symbol: d.symbol,
            name: d.name,
            assetClass: d.asset_class,
            provider: 'ALGORITHM',
            baseCurrency: d.base_currency || d.symbol.split('/')[0] || 'USD',
            quoteCurrency: d.quote_currency || d.symbol.split('/')[1] || 'USD',
            digits: d.digits ?? 2,
            minLot: Number(d.min_lot) || 0.01,
            lotStep: Number(d.lot_step) || 0.01,
            maxLot: Number(d.max_lot) || 50.0,
            contractSize: Number(d.contract_size) || (d.asset_class === 'FOREX' ? 100000 : 1),
            pipSize: Number(d.pip_size) || (d.digits === 5 ? 0.0001 : 0.01),
            defaultLeverage: Number(d.default_leverage) || 100,
            popular: Boolean(d.popular),
            basePrice: Number(d.base_price),
            currentPrice: Number(d.current_price) || Number(d.base_price),
            targetPrice: d.target_price ? Number(d.target_price) : undefined,
            direction: (d.direction || 'UP') as MarketTrend,
            strength: Number(d.strength) || 1.0,
            volatility: Number(d.volatility) || 0.0003,
            algorithm: d.algorithm || 'MOMENTUM',
            spread: Number(d.spread) || 0.0002,
            isCustom: Boolean(d.is_custom),
            isActive: d.is_active ?? true,
            updatedAt: d.updated_at || new Date().toISOString(),
          }));
        } else if (!error && (!data || data.length === 0)) {
          // Table exists but is empty - seed default instruments to Supabase
          this.seedSupabaseDefaults();
        }
      } catch (err) {
        console.warn('[MarketEngine] Could not fetch instruments from Supabase, checking local cache:', err);
      }
    }

    // Fallback to localStorage
    if (loaded.length === 0 && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_INSTRUMENTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loaded = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    // Fallback to defaults
    if (loaded.length === 0) {
      loaded = [...DEFAULT_INSTRUMENTS];
    }

    this.applyInstruments(loaded);
  }

  /**
   * Seed default instruments into Supabase table
   */
  private static async seedSupabaseDefaults() {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const rows = DEFAULT_INSTRUMENTS.map((inst) => ({
        symbol: inst.symbol,
        name: inst.name,
        asset_class: inst.assetClass,
        base_currency: inst.baseCurrency,
        quote_currency: inst.quoteCurrency,
        digits: inst.digits,
        base_price: inst.basePrice,
        current_price: inst.currentPrice,
        target_price: inst.targetPrice || null,
        direction: inst.direction,
        strength: inst.strength,
        volatility: inst.volatility,
        algorithm: inst.algorithm,
        spread: inst.spread,
        min_lot: inst.minLot,
        lot_step: inst.lotStep,
        max_lot: inst.maxLot,
        contract_size: inst.contractSize,
        pip_size: inst.pipSize,
        default_leverage: inst.defaultLeverage,
        popular: inst.popular || false,
        is_custom: inst.isCustom || false,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('market_instruments').upsert(rows, { onConflict: 'symbol' });
    } catch (e) {
      console.warn('[MarketEngine] Failed seeding default instruments to Supabase:', e);
    }
  }

  /**
   * Setup Supabase Realtime channel for live updates when admin alters trend or creates a pair
   */
  private static setupSupabaseSubscription() {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      supabase
        .channel('public:market_instruments')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'market_instruments' },
          (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const row = payload.new;
              if (row && row.symbol) {
                const updatedInst: Instrument = {
                  symbol: row.symbol,
                  name: row.name,
                  assetClass: row.asset_class,
                  provider: 'ALGORITHM',
                  baseCurrency: row.base_currency || row.symbol.split('/')[0] || 'USD',
                  quoteCurrency: row.quote_currency || row.symbol.split('/')[1] || 'USD',
                  digits: row.digits ?? 2,
                  minLot: Number(row.min_lot) || 0.01,
                  lotStep: Number(row.lot_step) || 0.01,
                  maxLot: Number(row.max_lot) || 50.0,
                  contractSize: Number(row.contract_size) || 1,
                  pipSize: Number(row.pip_size) || 0.0001,
                  defaultLeverage: Number(row.default_leverage) || 100,
                  popular: Boolean(row.popular),
                  basePrice: Number(row.base_price),
                  currentPrice: Number(row.current_price) || Number(row.base_price),
                  targetPrice: row.target_price ? Number(row.target_price) : undefined,
                  direction: row.direction as MarketTrend,
                  strength: Number(row.strength) || 1.0,
                  volatility: Number(row.volatility) || 0.0003,
                  algorithm: row.algorithm || 'MOMENTUM',
                  spread: Number(row.spread) || 0.0002,
                  isCustom: Boolean(row.is_custom),
                  isActive: row.is_active ?? true,
                  updatedAt: row.updated_at || new Date().toISOString(),
                };

                this.instrumentsMap.set(updatedInst.symbol, updatedInst);
                const all = Array.from(this.instrumentsMap.values());
                setInstruments(all);
                this.saveToLocalStorage(all);
              }
            } else if (payload.eventType === 'DELETE') {
              const old = payload.old;
              if (old && old.symbol) {
                this.instrumentsMap.delete(old.symbol);
                const all = Array.from(this.instrumentsMap.values());
                setInstruments(all);
                this.saveToLocalStorage(all);
              }
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[MarketEngine] Supabase Realtime setup failed:', err);
    }
  }

  private static applyInstruments(list: Instrument[]) {
    this.instrumentsMap.clear();
    for (const inst of list) {
      this.instrumentsMap.set(inst.symbol, inst);
    }
    setInstruments(list);
    this.saveToLocalStorage(list);
  }

  private static saveToLocalStorage(list: Instrument[]) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_INSTRUMENTS_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
    }
  }

  private static handleRemoteInstrumentsUpdate(list: Instrument[], broadcast = true) {
    this.applyInstruments(list);
    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'INSTRUMENTS_UPDATED', instruments: list });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Deterministic Algorithmic Price Calculation at any given Unix second
   * Synchronized across all users globally without server calculation overhead!
   */
  public static calculatePrice(inst: Instrument, timestampSec: number): number {
    const seed = hashString(inst.symbol);
    const anchorTime = Math.floor(new Date(inst.updatedAt).getTime() / 1000);
    const deltaSec = Math.max(0, timestampSec - anchorTime);

    // 1. Natural Organic Harmonic Waves (Multi-frequency macro cycle)
    const wave1 = Math.sin(timestampSec / 19 + (seed % 10)) * inst.basePrice * inst.volatility * 1.5;
    const wave2 = Math.cos(timestampSec / 59 + ((seed >> 2) % 10)) * inst.basePrice * inst.volatility * 2.2;
    const wave3 = Math.sin(timestampSec / 151 + ((seed >> 4) % 10)) * inst.basePrice * inst.volatility * 3.1;
    const harmonicCycle = wave1 + wave2 + wave3;

    // 2. Micro second-by-second Jitter / Ticks (PRNG seeded by symbol + exact second)
    const secondSeed = (seed + timestampSec) | 0;
    const jitterFactor = (pseudoRandom(secondSeed) - 0.5) * 2;
    const microJitter = jitterFactor * inst.basePrice * inst.volatility * 0.9;

    // 3. Directional Momentum or Target Seeker Drift (Admin set)
    let trendDrift = 0;

    if (inst.targetPrice !== undefined && inst.targetPrice !== null) {
      // Seek target price smoothly over ~90 seconds
      const targetDiff = inst.targetPrice - inst.basePrice;
      const progress = 1 - Math.exp(-deltaSec / 50); // asymptotic curve
      trendDrift = targetDiff * progress;
    } else {
      // Standard Directional Drift (UP, DOWN, or SIDEWAYS)
      const driftRate = inst.basePrice * 0.000035 * inst.strength;
      if (inst.direction === 'UP') {
        trendDrift = deltaSec * driftRate;
      } else if (inst.direction === 'DOWN') {
        trendDrift = -deltaSec * driftRate;
      } else {
        trendDrift = 0;
      }
    }

    // 4. Algorithm specifics (Pump, Dump, Sin Wave)
    if (inst.algorithm === 'PUMP') {
      trendDrift += Math.min(deltaSec * inst.basePrice * 0.0003, inst.basePrice * 0.08);
    } else if (inst.algorithm === 'DUMP') {
      trendDrift -= Math.min(deltaSec * inst.basePrice * 0.0003, inst.basePrice * 0.08);
    }

    // Final price
    let rawPrice = inst.basePrice + trendDrift + harmonicCycle + microJitter;
    if (rawPrice <= 0) rawPrice = inst.basePrice * 0.01;

    // Round to precision digits
    const factor = Math.pow(10, inst.digits);
    return Math.round(rawPrice * factor) / factor;
  }

  /**
   * Generates a complete MarketQuote object for an instrument at current time
   */
  public static getQuoteForInstrument(inst: Instrument, timestampSec: number = Math.floor(Date.now() / 1000)): MarketQuote {
    const price = this.calculatePrice(inst, timestampSec);
    const spread = inst.spread || price * 0.0002;
    const halfSpread = spread / 2;

    const bid = Math.round((price - halfSpread) * Math.pow(10, inst.digits)) / Math.pow(10, inst.digits);
    const ask = Math.round((price + halfSpread) * Math.pow(10, inst.digits)) / Math.pow(10, inst.digits);

    // Deterministic 24-hour baseline (anchor 86400s ago)
    const price24hAgo = this.calculatePrice(inst, timestampSec - 86400);
    const change24h = Math.round((price - price24hAgo) * Math.pow(10, inst.digits)) / Math.pow(10, inst.digits);
    const changePercent24h = price24hAgo > 0 ? Math.round(((change24h / price24hAgo) * 100) * 100) / 100 : 0;

    // Estimate 24h high and low around base
    const swing = inst.basePrice * inst.volatility * 35;
    const high24h = Math.max(price, Math.round((inst.basePrice + swing) * Math.pow(10, inst.digits)) / Math.pow(10, inst.digits));
    const low24h = Math.min(price, Math.round((inst.basePrice - swing) * Math.pow(10, inst.digits)) / Math.pow(10, inst.digits));

    // Dynamic volume
    const seed = hashString(inst.symbol);
    const volume24h = Math.floor(1000000 + (pseudoRandom(seed + Math.floor(timestampSec / 3600)) * 5000000));

    return {
      symbol: inst.symbol,
      price,
      bid,
      ask,
      spread,
      high24h,
      low24h,
      volume24h,
      change24h,
      changePercent24h,
      timestamp: timestampSec * 1000,
      provider: 'ALGORITHM',
      isRealTime: true,
      isMarketOpen: true,
      direction: inst.direction,
      targetPrice: inst.targetPrice,
    };
  }

  /**
   * Main 1000ms loop: emits live price ticks second by second
   */
  private static startTickLoop() {
    if (this.tickInterval) clearInterval(this.tickInterval);

    this.tickInterval = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      const quotesMap: Record<string, MarketQuote> = {};

      const instruments = Array.from(this.instrumentsMap.values());
      for (const inst of instruments) {
        if (!inst.isActive) continue;
        const q = this.getQuoteForInstrument(inst, nowSec);
        quotesMap[inst.symbol] = q;

        // Update in-memory currentPrice
        inst.currentPrice = q.price;

        // Notify specific symbol listeners
        const symbolSubs = this.subscribers.get(inst.symbol);
        if (symbolSubs && symbolSubs.size > 0) {
          symbolSubs.forEach((cb) => cb(q));
        }
      }

      // Notify global subscribers
      if (this.allSubscribers.size > 0) {
        this.allSubscribers.forEach((cb) => cb(quotesMap));
      }
    }, 1000);
  }

  /**
   * Fetch current quote for an instrument
   */
  static async getQuote(symbol: string): Promise<MarketQuote> {
    this.init();
    const inst = this.getInstrument(symbol);
    return this.getQuoteForInstrument(inst);
  }

  /**
   * Fetch historical candles for chart rendering (deterministic continuous OHLCV)
   */
  static async getCandles(symbol: string, timeframe: Timeframe = '1h'): Promise<CandleData[]> {
    this.init();
    const inst = this.getInstrument(symbol);

    const intervalMap: Record<Timeframe, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };

    const intervalSec = intervalMap[timeframe] || 3600;
    const count = 120; // 120 bars for smooth initial chart render
    const nowSec = Math.floor(Date.now() / 1000);
    const currentBarStart = Math.floor(nowSec / intervalSec) * intervalSec;

    const candles: CandleData[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const barTime = currentBarStart - i * intervalSec;
      const isCurrentBar = i === 0;

      const openTime = barTime;
      const closeTime = isCurrentBar ? nowSec : barTime + intervalSec - 1;

      const open = this.calculatePrice(inst, openTime);
      const close = this.calculatePrice(inst, closeTime);

      // Sample 3 internal points to derive authentic high/low
      const sample1 = this.calculatePrice(inst, barTime + Math.floor(intervalSec * 0.25));
      const sample2 = this.calculatePrice(inst, barTime + Math.floor(intervalSec * 0.5));
      const sample3 = this.calculatePrice(inst, barTime + Math.floor(intervalSec * 0.75));

      const high = Math.max(open, close, sample1, sample2, sample3);
      const low = Math.min(open, close, sample1, sample2, sample3);

      const barSeed = hashString(inst.symbol) + barTime;
      const volume = Math.floor(10 + pseudoRandom(barSeed) * 90 + Math.abs(close - open) * 1000);

      candles.push({
        time: barTime,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    return candles;
  }

  /**
   * Subscribe to real-time 1-second price ticks for a specific symbol
   */
  static subscribeQuote(symbol: string, callback: (quote: MarketQuote) => void): () => void {
    this.init();
    const clean = symbol.toUpperCase().replace('-', '/');

    if (!this.subscribers.has(clean)) {
      this.subscribers.set(clean, new Set());
    }
    this.subscribers.get(clean)!.add(callback);

    // Send immediate initial quote
    const inst = this.getInstrument(clean);
    callback(this.getQuoteForInstrument(inst));

    return () => {
      const set = this.subscribers.get(clean);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscribers.delete(clean);
        }
      }
    };
  }

  /**
   * Subscribe to all instruments quotes
   */
  static subscribeAll(callback: (quotes: Record<string, MarketQuote>) => void): () => void {
    this.init();
    this.allSubscribers.add(callback);
    return () => {
      this.allSubscribers.delete(callback);
    };
  }

  /**
   * Get instrument by symbol
   */
  static getInstrument(symbol: string): Instrument {
    const clean = symbol.toUpperCase().replace('-', '/');
    let inst = this.instrumentsMap.get(clean);
    if (!inst) {
      const fromList = getInstrumentBySymbol(clean);
      if (fromList) inst = fromList;
    }
    return inst || DEFAULT_INSTRUMENTS[0];
  }

  /**
   * Get all active instruments
   */
  static getAllInstruments(): Instrument[] {
    this.init();
    return Array.from(this.instrumentsMap.values());
  }

  // =========================================================================
  // ADMIN PANEL CONTROLS (UPS, DOWNS, TARGETS, CUSTOM PAIRS)
  // =========================================================================

  /**
   * Admin sets directional trend for a pair ('UP' | 'DOWN' | 'SIDEWAYS')
   * or sets target price, strength, volatility.
   */
  static async updateInstrumentTrend(
    symbol: string,
    direction: MarketTrend,
    options?: {
      targetPrice?: number;
      strength?: number;
      volatility?: number;
      algorithm?: Instrument['algorithm'];
    }
  ): Promise<boolean> {
    this.init();
    const clean = symbol.toUpperCase().replace('-', '/');
    const existing = this.getInstrument(clean);
    if (!existing) return false;

    // Anchor current price as the new base price so movement changes seamlessly without teleporting!
    const currentLivePrice = this.calculatePrice(existing, Math.floor(Date.now() / 1000));
    const nowIso = new Date().toISOString();

    const updated: Instrument = {
      ...existing,
      basePrice: currentLivePrice,
      currentPrice: currentLivePrice,
      direction,
      targetPrice: options?.targetPrice !== undefined ? options.targetPrice : undefined,
      strength: options?.strength ?? existing.strength,
      volatility: options?.volatility ?? existing.volatility,
      algorithm: options?.algorithm ?? existing.algorithm,
      updatedAt: nowIso,
    };

    // Update in-memory
    this.instrumentsMap.set(clean, updated);
    const all = Array.from(this.instrumentsMap.values());
    setInstruments(all);
    this.saveToLocalStorage(all);

    // Broadcast across tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'INSTRUMENTS_UPDATED', instruments: all });
    }

    // Persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('market_instruments')
          .update({
            base_price: updated.basePrice,
            current_price: updated.currentPrice,
            direction: updated.direction,
            target_price: updated.targetPrice || null,
            strength: updated.strength,
            volatility: updated.volatility,
            algorithm: updated.algorithm,
            updated_at: updated.updatedAt,
          })
          .eq('symbol', clean);
      } catch (err) {
        console.warn('[MarketEngine] Failed updating trend in Supabase:', err);
      }
    }

    return true;
  }

  /**
   * Admin creates a customized currency pair
   */
  static async createCustomInstrument(params: {
    symbol: string;
    name: string;
    assetClass?: Instrument['assetClass'];
    basePrice: number;
    digits?: number;
    direction?: MarketTrend;
    volatility?: number;
    strength?: number;
    targetPrice?: number;
  }): Promise<{ success: boolean; error?: string }> {
    this.init();
    const clean = params.symbol.toUpperCase().trim().replace('-', '/');
    if (!clean) return { success: false, error: 'Symbol is required' };

    if (this.instrumentsMap.has(clean)) {
      return { success: false, error: `Instrument ${clean} already exists` };
    }

    const digits = params.digits !== undefined ? params.digits : clean.includes('/') && params.basePrice < 10 ? 5 : 2;
    const basePrice = Number(params.basePrice);
    if (isNaN(basePrice) || basePrice <= 0) {
      return { success: false, error: 'Invalid base price' };
    }

    const spread = digits === 5 ? 0.0002 : basePrice * 0.0003;
    const pipSize = digits === 5 ? 0.0001 : 0.01;
    const assetClass = params.assetClass || 'FOREX';
    const parts = clean.split('/');

    const newInst: Instrument = {
      symbol: clean,
      name: params.name || clean,
      assetClass,
      provider: 'ALGORITHM',
      baseCurrency: parts[0] || clean,
      quoteCurrency: parts[1] || 'USD',
      digits,
      minLot: 0.01,
      lotStep: 0.01,
      maxLot: 100.0,
      contractSize: assetClass === 'FOREX' ? 100000 : 1,
      pipSize,
      defaultLeverage: 100,
      popular: true,
      basePrice,
      currentPrice: basePrice,
      direction: params.direction || 'UP',
      strength: params.strength || 1.0,
      volatility: params.volatility || 0.0003,
      algorithm: 'MOMENTUM',
      spread,
      targetPrice: params.targetPrice,
      isCustom: true,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    // Store in-memory
    this.instrumentsMap.set(clean, newInst);
    const all = Array.from(this.instrumentsMap.values());
    setInstruments(all);
    this.saveToLocalStorage(all);

    // Broadcast
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'INSTRUMENTS_UPDATED', instruments: all });
    }

    // Persist to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('market_instruments').insert({
          symbol: newInst.symbol,
          name: newInst.name,
          asset_class: newInst.assetClass,
          base_currency: newInst.baseCurrency,
          quote_currency: newInst.quoteCurrency,
          digits: newInst.digits,
          base_price: newInst.basePrice,
          current_price: newInst.currentPrice,
          direction: newInst.direction,
          strength: newInst.strength,
          volatility: newInst.volatility,
          algorithm: newInst.algorithm,
          spread: newInst.spread,
          target_price: newInst.targetPrice || null,
          min_lot: newInst.minLot,
          lot_step: newInst.lotStep,
          max_lot: newInst.maxLot,
          contract_size: newInst.contractSize,
          pip_size: newInst.pipSize,
          default_leverage: newInst.defaultLeverage,
          popular: true,
          is_custom: true,
          is_active: true,
          updated_at: newInst.updatedAt,
        });
      } catch (err: any) {
        console.warn('[MarketEngine] Failed saving custom pair to Supabase:', err.message);
      }
    }

    return { success: true };
  }

  /**
   * Admin deletes a custom instrument
   */
  static async deleteInstrument(symbol: string): Promise<boolean> {
    this.init();
    const clean = symbol.toUpperCase().replace('-', '/');
    if (!this.instrumentsMap.has(clean)) return false;

    this.instrumentsMap.delete(clean);
    const all = Array.from(this.instrumentsMap.values());
    setInstruments(all);
    this.saveToLocalStorage(all);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'INSTRUMENTS_UPDATED', instruments: all });
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('market_instruments').delete().eq('symbol', clean);
      } catch (e) {
        console.warn('Failed deleting instrument from Supabase', e);
      }
    }

    return true;
  }

  /**
   * Reset instruments to default baseline
   */
  static async resetToDefaults(): Promise<void> {
    this.applyInstruments([...DEFAULT_INSTRUMENTS]);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'INSTRUMENTS_UPDATED',
        instruments: [...DEFAULT_INSTRUMENTS],
      });
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('market_instruments').delete().neq('symbol', '__none__');
        await this.seedSupabaseDefaults();
      } catch (e) {
        console.warn('Failed resetting Supabase instruments', e);
      }
    }
  }
}

// Auto-initialize when file is imported
MarketDataService.init();
