import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import {
  BalanceTransaction,
  MarketQuote,
  Order,
  OrderSide,
  Position,
  Trade,
  TradingAccount,
} from '@/types';
import { MarketDataService } from '@/services/marketData';
import { getInstrumentBySymbol } from '@/lib/instruments';

interface TradingContextType {
  account: TradingAccount | null;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  transactions: BalanceTransaction[];
  watchlist: string[];
  quotes: Record<string, MarketQuote>;
  loading: boolean;
  totalUnrealizedPnl: number;
  equity: number;
  freeMargin: number;
  marginLevel: number;
  placeMarketOrder: (params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  closePosition: (positionId: string, closePrice?: number) => Promise<{ success: boolean; error?: string }>;
  closeAllPositions: () => Promise<void>;
  resetBalance: () => Promise<{ success: boolean; error?: string }>;
  toggleWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  updateQuote: (quote: MarketQuote) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_PREFIX = 'wellstrading_';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([
    'EUR/USD',
    'BTCUSDT',
    'ETHUSDT',
    'AAPL',
    'XAU/USD',
  ]);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [loading, setLoading] = useState(true);

  // Initialize or fetch data
  const loadUserData = useCallback(async () => {
    if (!user) {
      setAccount(null);
      setPositions([]);
      setOrders([]);
      setTrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        // Fetch Trading Account
        const { data: accData } = await supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (accData) {
          setAccount({
            id: accData.id,
            user_id: accData.user_id,
            account_number: accData.account_number,
            account_type: accData.account_type,
            currency: accData.currency,
            balance: Number(accData.balance),
            equity: Number(accData.equity),
            margin_used: Number(accData.margin_used),
            free_margin: Number(accData.free_margin),
            leverage: accData.leverage,
            status: accData.status,
            created_at: accData.created_at,
          });
        }

        // Fetch Open Positions
        const { data: posData } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'OPEN')
          .order('opened_at', { ascending: false });

        if (posData) {
          setPositions(
            posData.map((p) => ({
              ...p,
              quantity: Number(p.quantity),
              entry_price: Number(p.entry_price),
              current_price: Number(p.current_price),
              unrealized_pnl: Number(p.unrealized_pnl),
              margin: Number(p.margin),
              stop_loss: p.stop_loss ? Number(p.stop_loss) : undefined,
              take_profit: p.take_profit ? Number(p.take_profit) : undefined,
            }))
          );
        }

        // Fetch Closed Trades
        const { data: tradesData } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('closed_at', { ascending: false })
          .limit(50);

        if (tradesData) {
          setTrades(
            tradesData.map((t) => ({
              ...t,
              quantity: Number(t.quantity),
              entry_price: Number(t.entry_price),
              close_price: Number(t.close_price),
              realized_pnl: Number(t.realized_pnl),
              commission: Number(t.commission),
              swap: Number(t.swap),
            }))
          );
        }

        // Fetch Orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (ordersData) {
          setOrders(
            ordersData.map((o) => ({
              ...o,
              quantity: Number(o.quantity),
              price: o.price ? Number(o.price) : undefined,
              executed_price: o.executed_price ? Number(o.executed_price) : undefined,
              margin_required: Number(o.margin_required),
            }))
          );
        }

        // Fetch Watchlist items
        const { data: wlData } = await supabase
          .from('watchlist_items')
          .select('symbol')
          .eq('user_id', user.id);

        if (wlData && wlData.length > 0) {
          setWatchlist(wlData.map((i) => i.symbol));
        }
      } catch (err) {
        console.error('Error fetching Supabase trading data:', err);
      }
    } else {
      // Local demo storage fallback
      const accKey = `${STORAGE_PREFIX}account_${user.id}`;
      const posKey = `${STORAGE_PREFIX}positions_${user.id}`;
      const tradesKey = `${STORAGE_PREFIX}trades_${user.id}`;
      const ordersKey = `${STORAGE_PREFIX}orders_${user.id}`;
      const wlKey = `${STORAGE_PREFIX}watchlist_${user.id}`;

      const savedAcc = localStorage.getItem(accKey);
      if (savedAcc) {
        setAccount(JSON.parse(savedAcc));
      } else {
        const initialAcc: TradingAccount = {
          id: 'acc-' + Math.random().toString(36).substring(2, 9),
          user_id: user.id,
          account_number: 'WT-' + Math.floor(100000 + Math.random() * 900000),
          account_type: 'DEMO',
          currency: 'USD',
          balance: 10000.0,
          equity: 10000.0,
          margin_used: 0.0,
          free_margin: 10000.0,
          leverage: 100,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        };
        setAccount(initialAcc);
        localStorage.setItem(accKey, JSON.stringify(initialAcc));
      }

      const savedPos = localStorage.getItem(posKey);
      if (savedPos) setPositions(JSON.parse(savedPos));

      const savedTrades = localStorage.getItem(tradesKey);
      if (savedTrades) setTrades(JSON.parse(savedTrades));

      const savedOrders = localStorage.getItem(ordersKey);
      if (savedOrders) setOrders(JSON.parse(savedOrders));

      const savedWl = localStorage.getItem(wlKey);
      if (savedWl) setWatchlist(JSON.parse(savedWl));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Update quote helper
  const updateQuote = useCallback((quote: MarketQuote) => {
    setQuotes((prev) => ({
      ...prev,
      [quote.symbol]: quote,
    }));
  }, []);

  // Calculate live unrealized P/L for open positions based on latest quotes
  const { positionsWithPnl, totalUnrealizedPnl } = useMemo(() => {
    let totalPnl = 0;
    const updated = positions.map((pos) => {
      const q = quotes[pos.symbol];
      const curPrice = q ? q.price : pos.current_price;
      const inst = getInstrumentBySymbol(pos.symbol);
      const contractSize = inst?.contractSize || 1;

      let pnl = 0;
      if (pos.side === 'BUY') {
        pnl = (curPrice - pos.entry_price) * (pos.quantity * contractSize);
      } else {
        pnl = (pos.entry_price - curPrice) * (pos.quantity * contractSize);
      }

      totalPnl += pnl;
      return {
        ...pos,
        current_price: curPrice,
        unrealized_pnl: pnl,
      };
    });

    return { positionsWithPnl: updated, totalUnrealizedPnl: totalPnl };
  }, [positions, quotes]);

  // Real-time equity and free margin calculations
  const balance = account?.balance || 10000;
  const marginUsed = account?.margin_used || 0;
  const equity = Math.max(0, balance + totalUnrealizedPnl);
  const freeMargin = Math.max(0, equity - marginUsed);
  const marginLevel = marginUsed > 0 ? (equity / marginUsed) * 100 : 0;

  // Place market order
  const placeMarketOrder = async ({
    symbol,
    side,
    quantity,
    price,
    stopLoss,
    takeProfit,
  }: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    if (!account || !user) {
      return { success: false, error: 'User is not logged in' };
    }

    const inst = getInstrumentBySymbol(symbol);
    const leverage = account.leverage || 100;
    const contractSize = inst?.contractSize || 1;
    const marginReq = (quantity * contractSize * price) / leverage;

    if (freeMargin < marginReq) {
      return {
        success: false,
        error: `Insufficient free margin ($${freeMargin.toFixed(2)} available, $${marginReq.toFixed(2)} required)`,
      };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('execute_market_order', {
          p_symbol: symbol,
          p_side: side,
          p_quantity: quantity,
          p_price: price,
          p_stop_loss: stopLoss || null,
          p_take_profit: takeProfit || null,
          p_client_order_id: 'WT-ORD-' + Date.now(),
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // Reload data from Supabase
        await loadUserData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Execution failed' };
      }
    } else {
      // Local paper trading simulation
      const newOrderId = 'ord-' + Date.now();
      const newPosId = 'pos-' + Date.now();

      const newOrder: Order = {
        id: newOrderId,
        user_id: user.id,
        account_id: account.id,
        symbol,
        side,
        type: 'MARKET',
        status: 'FILLED',
        quantity,
        price,
        executed_price: price,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        margin_required: marginReq,
        created_at: new Date().toISOString(),
      };

      const newPosition: Position = {
        id: newPosId,
        user_id: user.id,
        account_id: account.id,
        order_id: newOrderId,
        symbol,
        side,
        quantity,
        entry_price: price,
        current_price: price,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        unrealized_pnl: 0,
        margin: marginReq,
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      };

      const updatedAccount: TradingAccount = {
        ...account,
        margin_used: account.margin_used + marginReq,
        free_margin: account.free_margin - marginReq,
      };

      const updatedPos = [newPosition, ...positions];
      const updatedOrders = [newOrder, ...orders];

      setPositions(updatedPos);
      setOrders(updatedOrders);
      setAccount(updatedAccount);

      localStorage.setItem(`${STORAGE_PREFIX}positions_${user.id}`, JSON.stringify(updatedPos));
      localStorage.setItem(`${STORAGE_PREFIX}orders_${user.id}`, JSON.stringify(updatedOrders));
      localStorage.setItem(`${STORAGE_PREFIX}account_${user.id}`, JSON.stringify(updatedAccount));

      return { success: true };
    }
  };

  // Close position
  const closePosition = async (positionId: string, explicitClosePrice?: number) => {
    if (!account || !user) return { success: false, error: 'User is not logged in' };

    const targetPos = positionsWithPnl.find((p) => p.id === positionId);
    if (!targetPos) return { success: false, error: 'Position not found' };

    const closePrice =
      explicitClosePrice ||
      quotes[targetPos.symbol]?.price ||
      targetPos.current_price;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.rpc('close_position', {
          p_position_id: positionId,
          p_close_price: closePrice,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        await loadUserData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Close failed' };
      }
    } else {
      // Local paper trading simulation
      const inst = getInstrumentBySymbol(targetPos.symbol);
      const contractSize = inst?.contractSize || 1;

      let pnl = 0;
      if (targetPos.side === 'BUY') {
        pnl = (closePrice - targetPos.entry_price) * (targetPos.quantity * contractSize);
      } else {
        pnl = (targetPos.entry_price - closePrice) * (targetPos.quantity * contractSize);
      }

      const newBalance = Math.max(0, account.balance + pnl);
      const newMarginUsed = Math.max(0, account.margin_used - targetPos.margin);

      const updatedAccount: TradingAccount = {
        ...account,
        balance: newBalance,
        equity: newBalance,
        margin_used: newMarginUsed,
        free_margin: newBalance - newMarginUsed,
      };

      const newTrade: Trade = {
        id: 'trade-' + Date.now(),
        user_id: user.id,
        account_id: account.id,
        position_id: targetPos.id,
        symbol: targetPos.symbol,
        side: targetPos.side,
        quantity: targetPos.quantity,
        entry_price: targetPos.entry_price,
        close_price: closePrice,
        realized_pnl: pnl,
        commission: 0,
        swap: 0,
        opened_at: targetPos.opened_at,
        closed_at: new Date().toISOString(),
      };

      const updatedPos = positions.filter((p) => p.id !== positionId);
      const updatedTrades = [newTrade, ...trades];

      setPositions(updatedPos);
      setTrades(updatedTrades);
      setAccount(updatedAccount);

      localStorage.setItem(`${STORAGE_PREFIX}positions_${user.id}`, JSON.stringify(updatedPos));
      localStorage.setItem(`${STORAGE_PREFIX}trades_${user.id}`, JSON.stringify(updatedTrades));
      localStorage.setItem(`${STORAGE_PREFIX}account_${user.id}`, JSON.stringify(updatedAccount));

      return { success: true };
    }
  };

  // Close all positions
  const closeAllPositions = async () => {
    for (const pos of positions) {
      await closePosition(pos.id);
    }
  };

  // Reset virtual balance to $10,000 USD
  const resetBalance = async () => {
    if (!account || !user) return { success: false, error: 'User is not logged in' };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.rpc('reset_demo_balance');
        if (error) return { success: false, error: error.message };
        await loadUserData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      const resetAcc: TradingAccount = {
        ...account,
        balance: 10000.0,
        equity: 10000.0,
        margin_used: 0.0,
        free_margin: 10000.0,
      };
      setAccount(resetAcc);
      setPositions([]);

      localStorage.setItem(`${STORAGE_PREFIX}account_${user.id}`, JSON.stringify(resetAcc));
      localStorage.setItem(`${STORAGE_PREFIX}positions_${user.id}`, JSON.stringify([]));

      return { success: true };
    }
  };

  // Watchlist helpers
  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) => {
      const exists = prev.includes(symbol);
      const next = exists ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      if (user) {
        localStorage.setItem(`${STORAGE_PREFIX}watchlist_${user.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const isInWatchlist = (symbol: string) => watchlist.includes(symbol);

  return (
    <TradingContext.Provider
      value={{
        account,
        positions: positionsWithPnl,
        orders,
        trades,
        transactions,
        watchlist,
        quotes,
        loading,
        totalUnrealizedPnl,
        equity,
        freeMargin,
        marginLevel,
        placeMarketOrder,
        closePosition,
        closeAllPositions,
        resetBalance,
        toggleWatchlist,
        isInWatchlist,
        updateQuote,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
