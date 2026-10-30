# WellsTrading — Minimalist Algorithmic Trading Platform

WellsTrading is a high-performance, minimalist online trading terminal with **predefined algorithmic charts**, low-latency second-by-second live movements, customized currency pair creation, and an intuitive **Admin Control Panel**.

**Architecture:** Pure User Frontend (React + Vite + TypeScript + Lightweight Charts) + Supabase for data (PostgreSQL, Realtime, and Paper Trading RPCs). **No PHP, no external API links, and no backend servers required.**

---

## 1. Key Architectural Features

- **Predefined Algorithmic Market Engine:**
  - Removed all third-party market data links (no Twelve Data, no Binance external dependencies or rate limits).
  - Deterministic time-synchronized price formula: every user viewing the chart at second $t$ sees the exact same candlesticks and ticks.
  - Low-latency 1-second (`1000ms`) real-time tick loop updating live candlestick highs, lows, and closes.
  - Multi-timeframe historical candlestick generation (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`) that smoothly leads directly into live second-by-second updates.
- **Admin Control Panel (`/admin`):**
  - **Directional Trajectory Control:** Set pairs to move **UP** (Bullish rally), **DOWN** (Bearish slide), or **FLAT** (Consolidation).
  - **Target Price Seeker:** Specify a target price (e.g. set EUR/USD to 1.1500) and watch the chart smoothly seek the target second-by-second.
  - **Instant Market Shocks:** Trigger **+3% Rally** (PUMP) or **-3% Flash Dip** (DUMP) with one click.
  - **Customized Currency Pair Creator:** Create any custom pair (e.g. `WELLS/USD`, `VIP/USDT`, `SOL/EUR`) with custom base price, decimal precision, volatility jitter, and directional trend.
  - Changes are persisted in Supabase (`market_instruments`) and broadcast live across all user sessions in real time.
- **Minimalist UI:**
  - Dark OLED minimalist interface (`#070b14`), distraction-free, zero clutter.
  - Fast pair switcher dropdown right on the terminal top bar with live flashing prices.
  - 1-click execution order ticket with lot selection chips (`0.01`, `0.10`, `0.50`, `1.00`, `5.00`), Stop Loss / Take Profit protection, and margin calculation.
  - Real-time Open Positions table with 1s live P&L updates and instant close buttons.

---

## 2. Platform Routes

- `/trade/:symbol` — Minimalist pro trading terminal with Lightweight Charts and 1-click execution.
- `/admin` — Admin Market Control Panel for setting UP/DOWN trajectories, creating custom pairs, and setting targets.
- `/markets` — Minimalist catalog of all active pairs and trends.
- `/positions` — Dedicated open positions manager.
- `/history` — Closed trade history and order log.
- `/dashboard` — Portfolio balance, equity, and win rate.
- `/login` & `/signup` — Authentication with automatic $10,000 USD virtual credit provisioning.

---

## 3. Supabase Setup

WellsTrading uses Supabase for persistent data, real-time broadcasts, and paper-trading database transactions:

1. Open your [Supabase Dashboard](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Copy and run the script in [supabase/schema.sql](supabase/schema.sql).
4. In your `.env` file, set:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

> **Offline / Local Demo Mode:** If Supabase is not configured yet, WellsTrading automatically engages its local browser engine with `BroadcastChannel` synchronization so everything works immediately out-of-the-box!

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build
```
