-- ==============================================================================
-- WellsTrading - Complete Supabase SQL Setup Script
-- Project ID: rtcbdviyzkhxwaxwpzqn
-- Direct SQL Editor URL: https://supabase.com/dashboard/project/rtcbdviyzkhxwaxwpzqn/sql/new
-- ==============================================================================

-- 1. PROFILES TABLE (Ensures support for existing or new profiles table)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    country TEXT DEFAULT 'United States',
    preferred_currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing table columns if already present
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TRADING ACCOUNTS TABLE (Virtual / Demo accounts)
CREATE TABLE IF NOT EXISTS public.trading_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_number TEXT UNIQUE NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'DEMO' CHECK (account_type IN ('DEMO', 'CONTEST')),
    currency TEXT NOT NULL DEFAULT 'USD',
    balance NUMERIC(18, 4) NOT NULL DEFAULT 10000.0000 CHECK (balance >= 0),
    equity NUMERIC(18, 4) NOT NULL DEFAULT 10000.0000,
    margin_used NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (margin_used >= 0),
    free_margin NUMERIC(18, 4) NOT NULL DEFAULT 10000.0000,
    leverage INTEGER NOT NULL DEFAULT 100 CHECK (leverage IN (1, 10, 20, 50, 100, 200, 500)),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WATCHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default Watchlist',
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WATCHLIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN ('FOREX', 'CRYPTO', 'STOCKS', 'INDICES', 'COMMODITIES')),
    provider TEXT NOT NULL DEFAULT 'TWELVE_DATA' CHECK (provider IN ('TWELVE_DATA', 'BINANCE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_watchlist_symbol UNIQUE (watchlist_id, symbol)
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type TEXT NOT NULL CHECK (type IN ('MARKET', 'LIMIT', 'STOP')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED')),
    quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
    price NUMERIC(18, 6),
    executed_price NUMERIC(18, 6),
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    margin_required NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    client_order_id TEXT UNIQUE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. POSITIONS TABLE
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
    entry_price NUMERIC(18, 6) NOT NULL,
    current_price NUMERIC(18, 6) NOT NULL,
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    unrealized_pnl NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    margin NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRADES TABLE (Closed trades history)
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    position_id UUID,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity NUMERIC(18, 6) NOT NULL,
    entry_price NUMERIC(18, 6) NOT NULL,
    close_price NUMERIC(18, 6) NOT NULL,
    realized_pnl NUMERIC(18, 4) NOT NULL,
    commission NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    swap NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BALANCE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('INITIAL_DEPOSIT', 'RESET_DEMO', 'TRADE_REALIZED_PNL', 'COMMISSION', 'ADJUSTMENT')),
    amount NUMERIC(18, 4) NOT NULL,
    balance_after NUMERIC(18, 4) NOT NULL,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trading Accounts Policies
DROP POLICY IF EXISTS "Users can view own trading accounts" ON public.trading_accounts;
CREATE POLICY "Users can view own trading accounts" ON public.trading_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- Watchlists Policies
DROP POLICY IF EXISTS "Users can manage own watchlists" ON public.watchlists;
CREATE POLICY "Users can manage own watchlists" ON public.watchlists
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can manage own watchlist items" ON public.watchlist_items
    FOR ALL USING (auth.uid() = user_id);

-- Orders Policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Positions Policies
DROP POLICY IF EXISTS "Users can view own positions" ON public.positions;
CREATE POLICY "Users can view own positions" ON public.positions
    FOR SELECT USING (auth.uid() = user_id);

-- Trades Policies
DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
CREATE POLICY "Users can view own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

-- Balance transactions Policies
DROP POLICY IF EXISTS "Users can view own balance transactions" ON public.balance_transactions;
CREATE POLICY "Users can view own balance transactions" ON public.balance_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- ==============================================================================
-- DATABASE FUNCTIONS & TRIGGERS (SECURE SERVER-SIDE PAPER TRADING ENGINE)
-- ==============================================================================

-- 1. Auto-create Profile and Demo Account on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_account_num TEXT;
    acc_id UUID;
    wl_id UUID;
BEGIN
    -- Upsert profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Trader'))
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

    -- Generate random account number WT-XXXXXX
    new_account_num := 'WT-' || (FLOOR(RANDOM() * 899999 + 100000))::TEXT;

    -- Create Demo Trading Account with $10,000 USD
    INSERT INTO public.trading_accounts (
        user_id, account_number, account_type, currency, balance, equity, margin_used, free_margin, leverage
    ) VALUES (
        NEW.id, new_account_num, 'DEMO', 'USD', 10000.0000, 10000.0000, 0.0000, 10000.0000, 100
    ) RETURNING id INTO acc_id;

    -- Record initial virtual deposit
    INSERT INTO public.balance_transactions (
        user_id, account_id, type, amount, balance_after, description
    ) VALUES (
        NEW.id, acc_id, 'INITIAL_DEPOSIT', 10000.0000, 10000.0000, 'Demo Account Initial Virtual Funds'
    );

    -- Create Default Watchlist
    INSERT INTO public.watchlists (user_id, name, is_default)
    VALUES (NEW.id, 'My Favorites', TRUE)
    RETURNING id INTO wl_id;

    -- Populate initial watchlist
    INSERT INTO public.watchlist_items (watchlist_id, user_id, symbol, name, asset_class, provider) VALUES
        (wl_id, NEW.id, 'EUR/USD', 'Euro / US Dollar', 'FOREX', 'TWELVE_DATA'),
        (wl_id, NEW.id, 'GBP/USD', 'British Pound / US Dollar', 'FOREX', 'TWELVE_DATA'),
        (wl_id, NEW.id, 'USD/JPY', 'US Dollar / Japanese Yen', 'FOREX', 'TWELVE_DATA'),
        (wl_id, NEW.id, 'BTCUSDT', 'Bitcoin / Tether', 'CRYPTO', 'BINANCE'),
        (wl_id, NEW.id, 'ETHUSDT', 'Ethereum / Tether', 'CRYPTO', 'BINANCE'),
        (wl_id, NEW.id, 'AAPL', 'Apple Inc.', 'STOCKS', 'TWELVE_DATA')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Secure RPC: Execute Market Order
CREATE OR REPLACE FUNCTION public.execute_market_order(
    p_symbol TEXT,
    p_side TEXT,
    p_quantity NUMERIC,
    p_price NUMERIC,
    p_stop_loss NUMERIC DEFAULT NULL,
    p_take_profit NUMERIC DEFAULT NULL,
    p_client_order_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_account public.trading_accounts%ROWTYPE;
    v_margin_required NUMERIC;
    v_order_id UUID;
    v_position_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Invalid order quantity';
    END IF;

    IF p_price <= 0 THEN
        RAISE EXCEPTION 'Invalid execution price';
    END IF;

    -- Lock trading account row for update
    SELECT * INTO v_account
    FROM public.trading_accounts
    WHERE user_id = v_user_id AND status = 'ACTIVE'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active trading account not found';
    END IF;

    -- Calculate required margin: (quantity * price) / leverage
    v_margin_required := (p_quantity * p_price) / v_account.leverage;

    -- Check available free margin
    IF v_account.free_margin < v_margin_required THEN
        RAISE EXCEPTION 'Insufficient free margin. Required: $%, Available: $%', ROUND(v_margin_required, 2), ROUND(v_account.free_margin, 2);
    END IF;

    -- Create order record
    INSERT INTO public.orders (
        user_id, account_id, symbol, side, type, status, quantity, price, executed_price,
        stop_loss, take_profit, margin_required, client_order_id
    ) VALUES (
        v_user_id, v_account.id, p_symbol, p_side, 'MARKET', 'FILLED', p_quantity, p_price, p_price,
        p_stop_loss, p_take_profit, v_margin_required, p_client_order_id
    ) RETURNING id INTO v_order_id;

    -- Create open position
    INSERT INTO public.positions (
        user_id, account_id, order_id, symbol, side, quantity, entry_price, current_price,
        stop_loss, take_profit, unrealized_pnl, margin, status
    ) VALUES (
        v_user_id, v_account.id, v_order_id, p_symbol, p_side, p_quantity, p_price, p_price,
        p_stop_loss, p_take_profit, 0.0000, v_margin_required, 'OPEN'
    ) RETURNING id INTO v_position_id;

    -- Update account margin and free margin
    UPDATE public.trading_accounts
    SET margin_used = margin_used + v_margin_required,
        free_margin = free_margin - v_margin_required,
        updated_at = NOW()
    WHERE id = v_account.id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'position_id', v_position_id,
        'symbol', p_symbol,
        'side', p_side,
        'quantity', p_quantity,
        'executed_price', p_price,
        'margin_used', v_margin_required
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Secure RPC: Close Position
CREATE OR REPLACE FUNCTION public.close_position(
    p_position_id UUID,
    p_close_price NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_position public.positions%ROWTYPE;
    v_account public.trading_accounts%ROWTYPE;
    v_realized_pnl NUMERIC;
    v_new_balance NUMERIC;
    v_trade_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated';
    END IF;

    -- Lock and retrieve position
    SELECT * INTO v_position
    FROM public.positions
    WHERE id = p_position_id AND user_id = v_user_id AND status = 'OPEN'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Open position not found or already closed';
    END IF;

    -- Lock trading account
    SELECT * INTO v_account
    FROM public.trading_accounts
    WHERE id = v_position.account_id
    FOR UPDATE;

    -- Calculate realized PnL
    IF v_position.side = 'BUY' THEN
        v_realized_pnl := (p_close_price - v_position.entry_price) * v_position.quantity;
    ELSE
        v_realized_pnl := (v_position.entry_price - p_close_price) * v_position.quantity;
    END IF;

    v_new_balance := v_account.balance + v_realized_pnl;
    IF v_new_balance < 0 THEN
        v_new_balance := 0; -- Negative balance protection for demo accounts
    END IF;

    -- Insert into trades table
    INSERT INTO public.trades (
        user_id, account_id, position_id, symbol, side, quantity,
        entry_price, close_price, realized_pnl, opened_at, closed_at
    ) VALUES (
        v_user_id, v_account.id, v_position.id, v_position.symbol, v_position.side,
        v_position.quantity, v_position.entry_price, p_close_price, v_realized_pnl,
        v_position.opened_at, NOW()
    ) RETURNING id INTO v_trade_id;

    -- Insert balance transaction
    INSERT INTO public.balance_transactions (
        user_id, account_id, type, amount, balance_after, reference_id, description
    ) VALUES (
        v_user_id, v_account.id, 'TRADE_REALIZED_PNL', v_realized_pnl, v_new_balance,
        v_position.symbol, 'Closed ' || v_position.side || ' ' || v_position.quantity || ' ' || v_position.symbol
    );

    -- Update position to CLOSED
    UPDATE public.positions
    SET status = 'CLOSED',
        current_price = p_close_price,
        unrealized_pnl = 0,
        updated_at = NOW()
    WHERE id = v_position.id;

    -- Update trading account
    UPDATE public.trading_accounts
    SET balance = v_new_balance,
        equity = v_new_balance,
        margin_used = GREATEST(0, margin_used - v_position.margin),
        free_margin = GREATEST(0, v_new_balance - GREATEST(0, margin_used - v_position.margin)),
        updated_at = NOW()
    WHERE id = v_account.id;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', v_trade_id,
        'realized_pnl', v_realized_pnl,
        'close_price', p_close_price,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure RPC: Reset Demo Balance to $10,000
CREATE OR REPLACE FUNCTION public.reset_demo_balance()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_account public.trading_accounts%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated';
    END IF;

    SELECT * INTO v_account
    FROM public.trading_accounts
    WHERE user_id = v_user_id AND status = 'ACTIVE'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active trading account not found';
    END IF;

    -- Close any remaining open positions
    UPDATE public.positions
    SET status = 'CLOSED',
        updated_at = NOW()
    WHERE user_id = v_user_id AND status = 'OPEN';

    -- Reset account
    UPDATE public.trading_accounts
    SET balance = 10000.0000,
        equity = 10000.0000,
        margin_used = 0.0000,
        free_margin = 10000.0000,
        updated_at = NOW()
    WHERE id = v_account.id;

    -- Record transaction
    INSERT INTO public.balance_transactions (
        user_id, account_id, type, amount, balance_after, description
    ) VALUES (
        v_user_id, v_account.id, 'RESET_DEMO', 10000.0000 - v_account.balance, 10000.0000, 'Demo Balance Reset to $10,000'
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', 10000.0000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
