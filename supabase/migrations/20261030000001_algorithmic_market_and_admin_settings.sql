-- ==============================================================================
-- WellsTrading - Database Migration: Algorithmic Market & Admin Controls
-- Project ID: rtcbdviyzkhxwaxwpzqn
-- ==============================================================================

-- 1. UPGRADE PROFILES TABLE (ADMIN ROLES & DETAILS)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Backfill profiles for all existing auth users
INSERT INTO public.profiles (id, email, full_name, role, is_admin)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    CASE WHEN email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN 'ADMIN' ELSE 'USER' END,
    CASE WHEN email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN TRUE ELSE FALSE END
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET role = CASE WHEN EXCLUDED.email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN 'ADMIN' ELSE public.profiles.role END,
    is_admin = CASE WHEN EXCLUDED.email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN TRUE ELSE public.profiles.is_admin END;

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

-- 2. ADMIN PLATFORM SETTINGS TABLE
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

-- Seed default settings
INSERT INTO public.admin_settings (id, platform_name, market_status, tick_interval_ms, default_leverage, demo_initial_balance)
VALUES ('default', 'WellsTrading', 'OPEN', 1000, 100, 10000.0000)
ON CONFLICT (id) DO NOTHING;

-- 3. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    admin_email TEXT,
    action TEXT NOT NULL,
    target_symbol TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MARKET INSTRUMENTS TABLE (ADMIN CONTROLLED ALGORITHMIC ENGINE)
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

-- Indexes for performance
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

-- 5. UPDATE OLD CONSTRAINTS ON WATCHLIST_ITEMS
ALTER TABLE public.watchlist_items DROP CONSTRAINT IF EXISTS watchlist_items_provider_check;
ALTER TABLE public.watchlist_items ADD CONSTRAINT watchlist_items_provider_check CHECK (provider IN ('ALGORITHM', 'TWELVE_DATA', 'BINANCE'));
ALTER TABLE public.watchlist_items ALTER COLUMN provider SET DEFAULT 'ALGORITHM';

ALTER TABLE public.watchlist_items DROP CONSTRAINT IF EXISTS watchlist_items_asset_class_check;
ALTER TABLE public.watchlist_items ADD CONSTRAINT watchlist_items_asset_class_check CHECK (asset_class IN ('FOREX', 'CRYPTO', 'STOCKS', 'INDICES', 'COMMODITIES', 'CUSTOM'));

-- 6. POPULATE PREDEFINED ALGORITHMIC MARKET PAIRS
INSERT INTO public.market_instruments (
    symbol, name, asset_class, base_currency, quote_currency, digits, base_price, current_price, direction, strength, volatility, algorithm, spread, min_lot, lot_step, max_lot, contract_size, pip_size, default_leverage, popular, is_custom, is_active
) VALUES
    ('EUR/USD', 'Euro / US Dollar', 'FOREX', 'EUR', 'USD', 5, 1.08640, 1.08640, 'UP', 1.0, 0.00015, 'MOMENTUM', 0.00015, 0.01, 0.01, 50.0, 100000, 0.0001, 100, TRUE, FALSE, TRUE),
    ('GBP/USD', 'British Pound / US Dollar', 'FOREX', 'GBP', 'USD', 5, 1.29850, 1.29850, 'UP', 1.2, 0.00020, 'MOMENTUM', 0.00018, 0.01, 0.01, 50.0, 100000, 0.0001, 100, TRUE, FALSE, TRUE),
    ('USD/JPY', 'US Dollar / Japanese Yen', 'FOREX', 'USD', 'JPY', 3, 152.450, 152.450, 'DOWN', 1.0, 0.00030, 'MOMENTUM', 0.020, 0.01, 0.01, 50.0, 100000, 0.01, 100, TRUE, FALSE, TRUE),
    ('AUD/USD', 'Australian Dollar / US Dollar', 'FOREX', 'AUD', 'USD', 5, 0.65820, 0.65820, 'UP', 0.9, 0.00020, 'MOMENTUM', 0.00018, 0.01, 0.01, 50.0, 100000, 0.0001, 100, FALSE, FALSE, TRUE),
    ('BTC/USDT', 'Bitcoin / Tether', 'CRYPTO', 'BTC', 'USDT', 2, 86450.00, 86450.00, 'UP', 1.5, 0.00080, 'MOMENTUM', 2.50, 0.001, 0.001, 10.0, 1, 0.01, 50, TRUE, FALSE, TRUE),
    ('ETH/USDT', 'Ethereum / Tether', 'CRYPTO', 'ETH', 'USDT', 2, 3180.50, 3180.50, 'UP', 1.4, 0.00090, 'MOMENTUM', 0.40, 0.01, 0.01, 100.0, 1, 0.01, 50, TRUE, FALSE, TRUE),
    ('SOL/USDT', 'Solana / Tether', 'CRYPTO', 'SOL', 'USDT', 2, 198.40, 198.40, 'UP', 1.8, 0.00120, 'MOMENTUM', 0.08, 0.1, 0.1, 500.0, 1, 0.01, 50, TRUE, FALSE, TRUE),
    ('XAU/USD', 'Gold / US Dollar', 'COMMODITIES', 'XAU', 'USD', 2, 2748.20, 2748.20, 'UP', 1.1, 0.00045, 'MOMENTUM', 0.35, 0.01, 0.01, 20.0, 100, 0.01, 50, TRUE, FALSE, TRUE),
    ('AAPL', 'Apple Inc.', 'STOCKS', 'USD', 'USD', 2, 234.80, 234.80, 'UP', 0.8, 0.00035, 'MOMENTUM', 0.05, 1.0, 1.0, 500.0, 1, 0.01, 20, TRUE, FALSE, TRUE),
    ('TSLA', 'Tesla, Inc.', 'STOCKS', 'USD', 'USD', 2, 218.40, 218.40, 'DOWN', 1.2, 0.00085, 'MOMENTUM', 0.08, 1.0, 1.0, 500.0, 1, 0.01, 20, FALSE, FALSE, TRUE),
    ('NVDA', 'NVIDIA Corporation', 'STOCKS', 'USD', 'USD', 2, 144.50, 144.50, 'UP', 1.6, 0.00095, 'MOMENTUM', 0.06, 1.0, 1.0, 500.0, 1, 0.01, 20, TRUE, FALSE, TRUE)
ON CONFLICT (symbol) DO UPDATE
SET base_price = EXCLUDED.base_price,
    current_price = EXCLUDED.current_price,
    direction = EXCLUDED.direction,
    updated_at = NOW();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_instruments ENABLE ROW LEVEL SECURITY;

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

-- 8. UPDATE USER REGISTRATION TRIGGER (ALGORITHMIC WATCHLIST & ADMIN ASSIGNMENT)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_account_num TEXT;
    acc_id UUID;
    wl_id UUID;
    user_role TEXT := 'USER';
    user_is_admin BOOLEAN := FALSE;
BEGIN
    -- Check if user is an admin
    IF NEW.email IN ('sjega82@gmail.com', 'admin@wellstrading.com') THEN
        user_role := 'ADMIN';
        user_is_admin := TRUE;
    END IF;

    -- Upsert profile with role
    INSERT INTO public.profiles (id, email, full_name, role, is_admin)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Trader'), user_role, user_is_admin)
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

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. SECURE RPC: ADMIN UPDATE INSTRUMENT WITH AUDIT LOGGING
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

-- 10. REALTIME REPLICATION CONFIGURATION
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
