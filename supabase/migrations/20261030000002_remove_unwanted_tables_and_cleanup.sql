-- ==============================================================================
-- WellsTrading - Database Cleanup & Unwanted Tables Removal
-- Removes:
--   1. public.balance_transactions (unused redundant ledger)
--   2. public.watchlists (redundant intermediary table; streamlined directly into watchlist_items)
--   3. Lingering orphaned functions from legacy social/healing template
-- Updates:
--   1. public.watchlist_items (streamlined directly by user_id & symbol)
--   2. public.handle_new_user() (cleaner trigger without balance_transactions or watchlists)
--   3. public.close_position() & reset_demo_balance() (removes balance_transactions writes)
--   4. Backfills trading_accounts and default watchlist_items for all existing users
-- ==============================================================================

-- 1. DROP ORPHANED LEGACY FUNCTIONS
DROP FUNCTION IF EXISTS public.notify_comment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_follow() CASCADE;
DROP FUNCTION IF EXISTS public.notify_healing_reaction() CASCADE;
DROP FUNCTION IF EXISTS public.notify_post_reaction() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_message() CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_last_message() CASCADE;
DROP FUNCTION IF EXISTS public.update_follow_counts() CASCADE;
DROP FUNCTION IF EXISTS public.update_healing_reactions_count() CASCADE;
DROP FUNCTION IF EXISTS public.update_reaction_counts() CASCADE;

-- 2. UPDATE FUNCTIONS REFERENCING UNWANTED TABLES

-- 2a. Update handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_account_num TEXT;
    acc_id UUID;
    user_role TEXT := 'USER';
    user_is_admin BOOLEAN := FALSE;
BEGIN
    -- Check if user is admin
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

    -- Seed Default Algorithmic Watchlist Items directly
    INSERT INTO public.watchlist_items (user_id, symbol) VALUES
        (NEW.id, 'EUR/USD'),
        (NEW.id, 'GBP/USD'),
        (NEW.id, 'USD/JPY'),
        (NEW.id, 'BTC/USDT'),
        (NEW.id, 'ETH/USDT'),
        (NEW.id, 'AAPL'),
        (NEW.id, 'XAU/USD')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2b. Update close_position()
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

-- 2c. Update reset_demo_balance()
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

    -- Reset account to $10,000 baseline
    UPDATE public.trading_accounts
    SET balance = 10000.0000,
        equity = 10000.0000,
        margin_used = 0.0000,
        free_margin = 10000.0000,
        updated_at = NOW()
    WHERE id = v_account.id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', 10000.0000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. REMOVE UNWANTED TABLES

-- 3a. Remove balance_transactions
DROP TABLE IF EXISTS public.balance_transactions CASCADE;

-- 3b. Streamline watchlist_items (remove dependency on watchlists)
ALTER TABLE public.watchlist_items DROP CONSTRAINT IF EXISTS watchlist_items_watchlist_id_fkey;
ALTER TABLE public.watchlist_items DROP CONSTRAINT IF EXISTS unique_watchlist_symbol;
ALTER TABLE public.watchlist_items DROP COLUMN IF EXISTS watchlist_id CASCADE;
ALTER TABLE public.watchlist_items DROP COLUMN IF EXISTS provider CASCADE;
ALTER TABLE public.watchlist_items DROP COLUMN IF EXISTS name CASCADE;
ALTER TABLE public.watchlist_items DROP COLUMN IF EXISTS asset_class CASCADE;

-- Add clean unique constraint (one star per user per symbol)
ALTER TABLE public.watchlist_items DROP CONSTRAINT IF EXISTS unique_user_watchlist_symbol;
ALTER TABLE public.watchlist_items ADD CONSTRAINT unique_user_watchlist_symbol UNIQUE (user_id, symbol);

-- Add foreign key constraint to market_instruments
DO $$
BEGIN
    ALTER TABLE public.watchlist_items 
        ADD CONSTRAINT fk_watchlist_market_instrument 
        FOREIGN KEY (symbol) REFERENCES public.market_instruments(symbol) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR others THEN NULL;
END $$;

-- 3c. Remove watchlists (redundant container table)
DROP TABLE IF EXISTS public.watchlists CASCADE;

-- 4. ROW LEVEL SECURITY ON STREAMLINED WATCHLIST_ITEMS
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own watchlist" ON public.watchlist_items;
CREATE POLICY "Users can manage their own watchlist" ON public.watchlist_items
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view watchlist items" ON public.watchlist_items;
CREATE POLICY "Public can view watchlist items" ON public.watchlist_items
    FOR SELECT USING (true);

-- 5. BACKFILL EXISTING USERS
-- Ensure all 5 existing users have an active demo trading account ($10,000 USD)
INSERT INTO public.trading_accounts (
    user_id, account_number, account_type, currency, balance, equity, margin_used, free_margin, leverage
)
SELECT 
    p.id,
    'WT-' || (FLOOR(RANDOM() * 899999 + 100000))::TEXT,
    'DEMO',
    'USD',
    10000.0000,
    10000.0000,
    0.0000,
    10000.0000,
    100
FROM public.profiles p
WHERE p.id NOT IN (SELECT user_id FROM public.trading_accounts WHERE user_id IS NOT NULL);

-- Seed default watchlist symbols for existing profiles
INSERT INTO public.watchlist_items (user_id, symbol)
SELECT p.id, s.symbol
FROM public.profiles p
CROSS JOIN (
    VALUES 
        ('EUR/USD'),
        ('GBP/USD'),
        ('USD/JPY'),
        ('BTC/USDT'),
        ('ETH/USDT'),
        ('AAPL'),
        ('XAU/USD')
) AS s(symbol)
ON CONFLICT (user_id, symbol) DO NOTHING;

-- 6. REALTIME REPLICATION REFRESH
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.watchlist_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
