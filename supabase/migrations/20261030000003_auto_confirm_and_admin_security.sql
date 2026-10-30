-- ==============================================================================
-- Migration: Auto-confirm users (no email/phone verify) & Admin Users RPC
-- ==============================================================================

-- 1. Auto-confirm all new user signups immediately
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_new_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_new_user
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();

-- 2. Secure RPC to fetch all users & trading accounts for Admin Dashboard
CREATE OR REPLACE FUNCTION public.admin_get_users_list()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMPTZ,
    account_number TEXT,
    balance NUMERIC,
    equity NUMERIC,
    leverage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        COALESCE(p.full_name, split_part(p.email, '@', 1)),
        p.role,
        p.is_admin,
        p.created_at,
        COALESCE(ta.account_number, 'WT-PENDING'),
        COALESCE(ta.balance, 10000.0000),
        COALESCE(ta.equity, 10000.0000),
        COALESCE(ta.leverage, 100)
    FROM public.profiles p
    LEFT JOIN public.trading_accounts ta ON ta.user_id = p.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
