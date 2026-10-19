# WellsTrading — XM-Inspired Serverless Online Trading Platform

WellsTrading is a high-performance, responsive online paper trading platform inspired by XM's user experience, featuring original branding, professional dark terminal styling, and a 100% serverless cloud architecture.

---

## 1. Architectural Highlights

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Interactive Charts:** TradingView Lightweight Charts (`lightweight-charts`) with real OHLC candlesticks, volume histogram, timeframe selectors (1m, 5m, 15m, 1h, 4h, 1d), crosshairs, and live tick updates.
- **Backend & Database:** Supabase PostgreSQL with strict Row Level Security (RLS) and atomic server-side stored functions (RPC).
- **Serverless API / Edge Functions:**
  - Vercel Serverless Edge Function (`api/twelve-data.ts`) and Supabase Edge Function (`supabase/functions/twelve-data/index.ts`) for secure proxying of Twelve Data API keys.
  - No secret keys are ever exposed in client JavaScript or `VITE_` variables.
- **Market Data Feeds:**
  - **Provider A (Twelve Data):** Supported Forex (`EUR/USD`, `GBP/USD`, `USD/JPY`), US Stocks (`AAPL`, `TSLA`, `NVDA`, `MSFT`), Precious Metals (`XAU/USD`), and Indices (`SPX`).
  - **Provider B (Binance Public API):** Cryptocurrency pairs (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`, etc.) with direct frontend REST requests and sub-second WebSockets (`wss://stream.binance.com:9443`).
- **Hosting & Infrastructure:** 100% Serverless on Vercel. **No VPS, no traditional Node.js backend server, no Docker.**

---

## 2. Platform Routes

- `/` — Institutional landing page with live ticker marquee, terminal teaser, and asset explorer.
- `/login` — User authentication with Supabase and 1-Click Instant Demo Login.
- `/signup` — Registration with automatic $10,000 USD virtual credit provisioning.
- `/dashboard` — Portfolio equity, balance, margin levels, win rate, and recent activity.
- `/markets` — Comprehensive market explorer with asset filters, search, and sorting.
- `/trade/:symbol` — Pro trading terminal with TradingView charts, XM-style dual execution tickets, depth tape, and positions table.
- `/positions` — Dedicated open positions manager with live unrealized P/L and position closing.
- `/history` — Audit log of closed trades, order executions, and balance transactions.
- `/watchlist` — Favorite instruments manager.
- `/settings` — Profile settings, virtual balance reset ($10,000 USD), and API diagnostics.

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your environment variables:

```env
# Supabase Client Configuration (Public / Safe for browser)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-Side Private Secret (PROTECTED - Vercel Serverless / Supabase Edge Functions only)
# Never expose with VITE_ prefix
TWELVE_DATA_API_KEY=ea779f93ae4044cc90d1de33ef0936f6
```

> **Note on Offline / Local Demo Mode:** If Supabase is not yet configured, WellsTrading automatically engages its built-in browser-based demo engine. All paper trading features, balances, orders, and positions work immediately out-of-the-box.

---

## 4. Supabase Database & Security Setup

WellsTrading uses Supabase for authentication, PostgreSQL persistent storage, and server-side transaction safety.

### Setup Instructions

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project (or select an existing one).
3. Navigate to **SQL Editor** -> **New Query**.
4. Open [supabase/schema.sql](supabase/schema.sql) in this repository, paste the entire contents into the SQL Editor, and click **Run**.

### Schema Summary

- `profiles` — User profile, display name, and preferences.
- `trading_accounts` — Virtual balance ($10,000.00 USD), equity, margin used, free margin, and leverage (1:100).
- `watchlists` & `watchlist_items` — Favorite instruments per user.
- `orders` — Audit trail of pending, filled, and cancelled orders.
- `positions` — Open positions with entry price, current price, stop loss, take profit, and margin.
- `trades` — Closed positions ledger with realized P/L.
- `balance_transactions` — Historical credits, resets, and trade P/L adjustments.

### Row Level Security (RLS)

All tables enforce Row Level Security:
- `auth.uid() = user_id` prevents unauthorized access across users.
- Browser clients cannot directly edit balances, margins, or mark trades as executed.

### Trusted Database Stored Procedures (RPC)

1. `handle_new_user()` — Trigger fired on user registration to automatically create a profile, generate a unique trading account number (`WT-XXXXXX`), fund it with $10,000 USD virtual credit, and populate default watchlist items.
2. `execute_market_order(...)` — Validates available free margin, calculates required margin based on leverage, atomically creates the order, opens the position, and deducts margin.
3. `close_position(...)` — Computes realized P/L based on market price, releases margin, credits/debits the account balance, archives the trade, and logs the balance transaction.
4. `reset_demo_balance()` — Atomically resets virtual balance to $10,000.00 USD and closes any remaining open positions.

---

## 5. Local Development

Install dependencies and start the Vite development server:

```bash
# Using pnpm (recommended)
pnpm install
pnpm dev

# Or using npm
npm install
npm run dev
```

Visit `http://localhost:5173` to explore the terminal.

### Production Build Verification

```bash
pnpm build
```

---

## 6. Vercel Deployment Instructions

WellsTrading is fully prepared for one-click deployment on Vercel:

1. Push your repository to **GitHub**.
2. Go to the [Vercel Dashboard](https://vercel.com/new) and click **Add New Project**.
3. Import your `wellstrading` repository.
4. Configure Project Settings:
   - **Framework Preset:** Vite
   - **Build Command:** `pnpm build` (or `npm run build`)
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - `TWELVE_DATA_API_KEY` = `ea779f93ae4044cc90d1de33ef0936f6` (Server-side secret, NOT exposed to client)
   - `VITE_SUPABASE_URL` = `https://<your-project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`
6. Click **Deploy**.
7. In your Supabase Dashboard under **Authentication** -> **URL Configuration**, add your Vercel production URL (e.g. `https://wellstrading.vercel.app`) to the **Redirect URLs**.

---

## 7. Testing & Quality Assurance Checklist

- [x] **Lightweight Charts:** Real OHLC historical candles render properly with zoom, pan, crosshair, and timeframes (1m, 5m, 15m, 1h, 4h, 1d).
- [x] **Binance Public API:** Sub-second WebSocket stream updates live BTC/USDT and ETH/USDT tickers with green/red price flashing.
- [x] **Twelve Data Integration:** Forex quotes (EUR/USD, GBP/USD) fetched securely via serverless proxy without leaking secrets to the browser.
- [x] **Order Ticket:** Buy and Sell execution with dynamic volume adjustment (lots), pip calculations, and margin validation.
- [x] **Margin Protection:** Insufficient free margin warnings block orders that exceed account limits.
- [x] **Positions Management:** Real-time unrealized P/L mark-to-market updates; positions close atomically with balance crediting.
- [x] **Balance Reset:** Resetting balance cleanly restores $10,000.00 USD virtual credit.
- [x] **Search & Watchlist:** Global `Ctrl+K` instrument search with category filtering across Forex, Crypto, Stocks, and Commodities.
- [x] **Serverless & SPA Compatibility:** `vercel.json` rewrites and SPA navigation handle browser reloads seamlessly.
- [x] **Demo Disclaimer:** Platform clearly indicates simulated paper trading for training purposes only.
