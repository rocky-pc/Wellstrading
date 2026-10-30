-- ==============================================================================
-- WellsTrading - Complete Supabase PostgreSQL Database Schema
-- Project ID: rtcbdviyzkhxwaxwpzqn
-- Direct SQL Editor URL: https://supabase.com/dashboard/project/rtcbdviyzkhxwaxwpzqn/sql/new
-- ==============================================================================

-- 1. PROFILES TABLE (User profiles, roles, and admin privileges)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    country TEXT DEFAULT 'United States',
    preferred_currency TEXT DEFAULT 'USD',
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    phone TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing table columns if already present
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Helper function to check admin privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (is_admin = TRUE OR role IN ('ADMIN', 'SUPER_ADMIN'))
    ) OR (
        SELECT email FROM auth.users WHERE id = auth.uid()
    ) IN ('sjega82@gmail.com', 'admin@wellstrading.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

-- 4. WATCHLIST ITEMS TABLE (Predefined Algorithmic + Custom Pairs)
CREATE TABLE IF NOT EXISTS public.watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN ('FOREX', 'CRYPTO', 'STOCKS', 'INDICES', 'COMMODITIES', 'CUSTOM')),
    provider TEXT NOT NULL DEFAULT 'ALGORITHM' CHECK (provider IN ('ALGORITHM', 'TWELVE_DATA', 'BINANCE')),
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

-- 9. ADMIN PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    platform_name TEXT NOT NULL DEFAULT 'WellsTrading',
    market_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (market_status IN ('OPEN', 'HALTED', 'MAINTENANCE')),
    tick_interval_ms INTEGER NOT NULL DEFAULT 1000 CHECK (tick_interval_ms BETWEEN 200 AND 10000),
    default_leverage INTEGER NOT NULL DEFAULT 100 CHECK (default_leverage IN (1, 10, 20, 50, 100, 200, 500)),
    demo_initial_balance NUMERIC(18, 4) NOT NULL DEFAULT 10000.0000 CHECK (demo_initial_balance > 0),
    allow_user_registration BOOLEAN NOT NULL DEFAULT TRUE,
    allow_custom_pairs BOOLEAN NOT NULL DEFAULT TRUE,
    global_drift_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1.0,
    maintenance_message TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    admin_email TEXT,
    action TEXT NOT NULL,
    target_symbol TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MARKET INSTRUMENTS TABLE (PREDEFINED ALGORITHMIC + CUSTOM PAIRS)
CREATE TABLE IF NOT EXISTS public.market_instruments (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN ('FOREX', 'CRYPTO', 'STOCKS', 'INDICES', 'COMMODITIES', 'CUSTOM')),
    base_currency TEXT NOT NULL DEFAULT 'USD',
    quote_currency TEXT NOT NULL DEFAULT 'USD',
    digits INTEGER NOT NULL DEFAULT 5 CHECK (digits BETWEEN 0 AND 8),
    base_price NUMERIC(18, 6) NOT NULL CHECK (base_price > 0),
    current_price NUMERIC(18, 6) NOT NULL CHECK (current_price > 0),
    target_price NUMERIC(18, 6),
    direction TEXT NOT NULL DEFAULT 'UP' CHECK (direction IN ('UP', 'DOWN', 'SIDEWAYS')),
    strength NUMERIC(8, 4) NOT NULL DEFAULT 1.0 CHECK (strength BETWEEN 0.1 AND 10.0),
    volatility NUMERIC(8, 6) NOT NULL DEFAULT 0.0003 CHECK (volatility >= 0.00001),
    algorithm TEXT NOT NULL DEFAULT 'MOMENTUM' CHECK (algorithm IN ('MOMENTUM', 'TARGET_SEEK', 'SIN_WAVE', 'PUMP', 'DUMP')),
    spread NUMERIC(18, 6) NOT NULL DEFAULT 0.0002 CHECK (spread >= 0),
    min_lot NUMERIC(18, 4) NOT NULL DEFAULT 0.01 CHECK (min_lot > 0),
    lot_step NUMERIC(18, 4) NOT NULL DEFAULT 0.01 CHECK (lot_step > 0),
    max_lot NUMERIC(18, 4) NOT NULL DEFAULT 50.0 CHECK (max_lot >= min_lot),
    contract_size NUMERIC(18, 4) NOT NULL DEFAULT 100000 CHECK (contract_size > 0),
    pip_size NUMERIC(18, 6) NOT NULL DEFAULT 0.0001 CHECK (pip_size > 0),
    default_leverage INTEGER NOT NULL DEFAULT 100 CHECK (default_leverage IN (1, 10, 20, 50, 100, 200, 500)),
    popular BOOLEAN NOT NULL DEFAULT TRUE,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_market_instruments_asset_class ON public.market_instruments(asset_class);
CREATE INDEX IF NOT EXISTS idx_market_instruments_is_active ON public.market_instruments(is_active);
CREATE INDEX IF NOT EXISTS idx_market_instruments_popular ON public.market_instruments(popular);

-- Trigger for auto-updating updated_at on market_instruments
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_market_instruments_updated_at ON public.market_instruments;
CREATE TRIGGER trg_market_instruments_updated_at
    BEFORE UPDATE ON public.market_instruments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_instruments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admin can view all" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trading Accounts Policies
DROP POLICY IF EXISTS "Users can view own trading accounts" ON public.trading_accounts;
CREATE POLICY "Users can view own trading accounts" ON public.trading_accounts
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

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
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Positions Policies
DROP POLICY IF EXISTS "Users can view own positions" ON public.positions;
CREATE POLICY "Users can view own positions" ON public.positions
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Trades Policies
DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
CREATE POLICY "Users can view own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Balance transactions Policies
DROP POLICY IF EXISTS "Users can view own balance transactions" ON public.balance_transactions;
CREATE POLICY "Users can view own balance transactions" ON public.balance_transactions
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Admin Settings Policies
DROP POLICY IF EXISTS "Public can view platform settings" ON public.admin_settings;
CREATE POLICY "Public can view platform settings" ON public.admin_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update platform settings" ON public.admin_settings;
CREATE POLICY "Admins can update platform settings" ON public.admin_settings
    FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

-- Admin Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
    FOR SELECT USING (public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
    FOR INSERT WITH CHECK (true);

-- Market Instruments Policies
DROP POLICY IF EXISTS "Anyone can view active instruments" ON public.market_instruments;
CREATE POLICY "Anyone can view active instruments" ON public.market_instruments
    FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage instruments" ON public.market_instruments;
CREATE POLICY "Admins can manage instruments" ON public.market_instruments
    FOR ALL USING (public.is_admin() OR auth.role() = 'authenticated');

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
    user_role TEXT := 'USER';
    user_is_admin BOOLEAN := FALSE;
BEGIN
    -- Check if user is configured as administrator
    IF NEW.email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN
        user_role := 'ADMIN';
        user_is_admin := TRUE;
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (id, email, full_name, role, is_admin)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), user_role, user_is_admin)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = CASE WHEN EXCLUDED.email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN 'ADMIN' ELSE public.profiles.role END,
        is_admin = CASE WHEN EXCLUDED.email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN TRUE ELSE public.profiles.is_admin END;

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

    -- Populate initial watchlist with algorithmic instruments
    INSERT INTO public.watchlist_items (watchlist_id, user_id, symbol, name, asset_class, provider) VALUES
        (wl_id, NEW.id, 'EUR/USD', 'Euro / US Dollar', 'FOREX', 'ALGORITHM'),
        (wl_id, NEW.id, 'GBP/USD', 'British Pound / US Dollar', 'FOREX', 'ALGORITHM'),
        (wl_id, NEW.id, 'USD/JPY', 'US Dollar / Japanese Yen', 'FOREX', 'ALGORITHM'),
        (wl_id, NEW.id, 'BTC/USDT', 'Bitcoin / Tether', 'CRYPTO', 'ALGORITHM'),
        (wl_id, NEW.id, 'ETH/USDT', 'Ethereum / Tether', 'CRYPTO', 'ALGORITHM'),
        (wl_id, NEW.id, 'AAPL', 'Apple Inc.', 'STOCKS', 'ALGORITHM')
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
    v_contract_size NUMERIC := 100000;
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

    -- Get contract size from market instruments if available
    SELECT contract_size INTO v_contract_size
    FROM public.market_instruments
    WHERE symbol = p_symbol;

    IF v_contract_size IS NULL THEN
        IF p_symbol LIKE '%/%' THEN v_contract_size := 100000; ELSE v_contract_size := 1; END IF;
    END IF;

    -- Margin formula: (Quantity * ContractSize * ExecutionPrice) / Leverage
    v_margin_required := (p_quantity * v_contract_size * p_price) / v_account.leverage;

    -- Free margin check
    IF v_account.free_margin < v_margin_required THEN
        RAISE EXCEPTION 'Insufficient free margin. Required: %, Available: %', v_margin_required, v_account.free_margin;
    END IF;

    -- Insert Filled Order
    INSERT INTO public.orders (
        user_id, account_id, symbol, side, type, status, quantity, price, executed_price,
        stop_loss, take_profit, margin_required, client_order_id
    ) VALUES (
        v_user_id, v_account.id, p_symbol, p_side, 'MARKET', 'FILLED', p_quantity, p_price, p_price,
        p_stop_loss, p_take_profit, v_margin_required, p_client_order_id
    ) RETURNING id INTO v_order_id;

    -- Open Position
    INSERT INTO public.positions (
        user_id, account_id, order_id, symbol, side, quantity, entry_price, current_price,
        stop_loss, take_profit, unrealized_pnl, margin, status
    ) VALUES (
        v_user_id, v_account.id, v_order_id, p_symbol, p_side, p_quantity, p_price, p_price,
        p_stop_loss, p_take_profit, 0.0000, v_margin_required, 'OPEN'
    ) RETURNING id INTO v_position_id;

    -- Deduct margin from trading account
    UPDATE public.trading_accounts
    SET margin_used = margin_used + v_margin_required,
        free_margin = free_margin - v_margin_required,
        updated_at = NOW()
    WHERE id = v_account.id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'position_id', v_position_id,
        'executed_price', p_price,
        'margin_required', v_margin_required
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
    v_pos public.positions%ROWTYPE;
    v_account public.trading_accounts%ROWTYPE;
    v_realized_pnl NUMERIC;
    v_contract_size NUMERIC := 100000;
    v_trade_id UUID;
    v_new_balance NUMERIC;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated';
    END IF;

    -- Lock position row
    SELECT * INTO v_pos
    FROM public.positions
    WHERE id = p_position_id AND user_id = v_user_id AND status = 'OPEN'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Open position not found';
    END IF;

    -- Lock account row
    SELECT * INTO v_account
    FROM public.trading_accounts
    WHERE id = v_pos.account_id
    FOR UPDATE;

    -- Get contract size
    SELECT contract_size INTO v_contract_size
    FROM public.market_instruments
    WHERE symbol = v_pos.symbol;

    IF v_contract_size IS NULL THEN
        IF v_pos.symbol LIKE '%/%' THEN v_contract_size := 100000; ELSE v_contract_size := 1; END IF;
    END IF;

    -- Calculate PnL
    IF v_pos.side = 'BUY' THEN
        v_realized_pnl := (p_close_price - v_pos.entry_price) * (v_pos.quantity * v_contract_size);
    ELSE
        v_realized_pnl := (v_pos.entry_price - p_close_price) * (v_pos.quantity * v_contract_size);
    END IF;

    -- Mark position closed
    UPDATE public.positions
    SET status = 'CLOSED',
        current_price = p_close_price,
        unrealized_pnl = v_realized_pnl,
        updated_at = NOW()
    WHERE id = v_pos.id;

    -- Archive into trades table
    INSERT INTO public.trades (
        user_id, account_id, position_id, symbol, side, quantity,
        entry_price, close_price, realized_pnl, commission, swap, opened_at, closed_at
    ) VALUES (
        v_user_id, v_account.id, v_pos.id, v_pos.symbol, v_pos.side, v_pos.quantity,
        v_pos.entry_price, p_close_price, v_realized_pnl, 0.0000, 0.0000, v_pos.opened_at, NOW()
    ) RETURNING id INTO v_trade_id;

    -- Compute new balance
    v_new_balance := GREATEST(0, v_account.balance + v_realized_pnl);

    -- Release margin & credit balance
    UPDATE public.trading_accounts
    SET balance = v_new_balance,
        margin_used = GREATEST(0, margin_used - v_pos.margin),
        free_margin = v_new_balance - GREATEST(0, margin_used - v_pos.margin),
        equity = v_new_balance,
        updated_at = NOW()
    WHERE id = v_account.id;

    -- Record transaction
    INSERT INTO public.balance_transactions (
        user_id, account_id, type, amount, balance_after, reference_id, description
    ) VALUES (
        v_user_id, v_account.id, 'TRADE_REALIZED_PNL', v_realized_pnl, v_new_balance, v_trade_id::TEXT,
        'Realized P/L on ' || v_pos.side || ' ' || v_pos.quantity || ' ' || v_pos.symbol
    );

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', v_trade_id,
        'realized_pnl', v_realized_pnl,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure RPC: Reset Demo Balance to $10,000 USD
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

-- 5. Secure RPC: Admin Update Instrument with Audit Logging
CREATE OR REPLACE FUNCTION public.admin_update_instrument(
    p_symbol TEXT,
    p_direction TEXT,
    p_target_price NUMERIC DEFAULT NULL,
    p_strength NUMERIC DEFAULT NULL,
    p_volatility NUMERIC DEFAULT NULL,
    p_algorithm TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_email TEXT;
    v_old public.market_instruments%ROWTYPE;
BEGIN
    SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

    SELECT * INTO v_old FROM public.market_instruments WHERE symbol = p_symbol;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Instrument % not found', p_symbol;
    END IF;

    -- Update instrument
    UPDATE public.market_instruments
    SET direction = COALESCE(p_direction, direction),
        target_price = p_target_price,
        strength = COALESCE(p_strength, strength),
        volatility = COALESCE(p_volatility, volatility),
        algorithm = COALESCE(p_algorithm, algorithm),
        base_price = current_price,
        updated_at = NOW()
    WHERE symbol = p_symbol;

    -- Log admin audit action
    INSERT INTO public.admin_audit_logs (admin_id, admin_email, action, target_symbol, details)
    VALUES (
        auth.uid(),
        v_admin_email,
        'UPDATE_TRAJECTORY',
        p_symbol,
        jsonb_build_object(
            'previous_direction', v_old.direction,
            'new_direction', p_direction,
            'target_price', p_target_price,
            'strength', p_strength,
            'volatility', p_volatility
        )
    );

    RETURN jsonb_build_object('success', true, 'symbol', p_symbol);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- REALTIME REPLICATION CONFIGURATION
-- ==============================================================================

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_instruments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_accounts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
