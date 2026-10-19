import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, CrosshairMode } from 'lightweight-charts';
import { CandleData, Instrument, MarketQuote, Timeframe } from '@/types';
import { MarketDataService } from '@/services/marketData';
import { formatPrice } from '@/lib/instruments';
import { Clock, RefreshCw, Maximize2, Minimize2, Radio, AlertCircle } from 'lucide-react';

interface Props {
  symbol: string;
  instrument: Instrument;
  latestQuote: MarketQuote | null;
}

export const TradingChart: React.FC<Props> = ({ symbol, instrument, latestQuote }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lastCandleRef = useRef<CandleData | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crosshairInfo, setCrosshairInfo] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    time: string;
    change: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Timeframe selector options
  const timeframes: { label: string; value: Timeframe }[] = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1D', value: '1d' },
  ];

  // Fetch candle data and render chart
  const loadCandleData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const candles = await MarketDataService.getCandles(symbol, timeframe);

      if (!candles || candles.length === 0) {
        throw new Error(`No historical candles available for ${symbol} (${timeframe})`);
      }

      if (candleSeriesRef.current && chartRef.current) {
        const formattedCandles = candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        candleSeriesRef.current.setData(formattedCandles);

        if (volumeSeriesRef.current) {
          const volumeData = candles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume || 1,
            color: c.close >= c.open ? 'rgba(0, 192, 118, 0.25)' : 'rgba(255, 77, 79, 0.25)',
          }));
          volumeSeriesRef.current.setData(volumeData);
        }

        lastCandleRef.current = candles[candles.length - 1];
        chartRef.current.timeScale().fitContent();
      }
    } catch (err: any) {
      console.warn('Error loading candles:', err);
      setError(err.message || 'Failed to fetch historical market data');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  // Initialize Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Dispose old chart if exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 450,
      layout: {
        background: { color: '#090e1a' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#38bdf8',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#0284c7',
        },
        horzLine: {
          color: '#38bdf8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0284c7',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00c076',
      downColor: '#ff4d4f',
      borderUpColor: '#00c076',
      borderDownColor: '#ff4d4f',
      wickUpColor: '#00c076',
      wickDownColor: '#ff4d4f',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    chartRef.current = chart;

    // Crosshair move subscription for header details
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        setCrosshairInfo(null);
      } else {
        const data = param.seriesData.get(candleSeries) as any;
        if (data) {
          const dateStr = typeof param.time === 'number'
            ? new Date(param.time * 1000).toLocaleString()
            : String(param.time);
          const chg = data.close - data.open;
          setCrosshairInfo({
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            time: dateStr,
            change: chg,
          });
        }
      }
    });

    // Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height: height || 450 });
    });

    resizeObserver.observe(container);

    loadCandleData();

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, timeframe, loadCandleData]);

  // Live update the latest candle when a real-time quote arrives
  useEffect(() => {
    if (!latestQuote || !candleSeriesRef.current || !lastCandleRef.current) return;

    const currentPrice = latestQuote.price;
    const last = lastCandleRef.current;

    const updatedCandle: CandleData = {
      ...last,
      close: currentPrice,
      high: Math.max(last.high, currentPrice),
      low: Math.min(last.low, currentPrice),
    };

    lastCandleRef.current = updatedCandle;

    candleSeriesRef.current.update({
      time: updatedCandle.time as UTCTimestamp,
      open: updatedCandle.open,
      high: updatedCandle.high,
      low: updatedCandle.low,
      close: updatedCandle.close,
    });
  }, [latestQuote]);

  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return;
    if (!isFullscreen) {
      if (chartContainerRef.current.requestFullscreen) {
        chartContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-[#090e1a] rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-[#070b14]/80 text-xs gap-2">
        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${
                timeframe === tf.value
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Crosshair live OHLC preview */}
        {crosshairInfo ? (
          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-slate-300">
            <span>
              O: <b className="text-white">{formatPrice(crosshairInfo.open, instrument.digits)}</b>
            </span>
            <span>
              H: <b className="text-white">{formatPrice(crosshairInfo.high, instrument.digits)}</b>
            </span>
            <span>
              L: <b className="text-white">{formatPrice(crosshairInfo.low, instrument.digits)}</b>
            </span>
            <span>
              C: <b className="text-white">{formatPrice(crosshairInfo.close, instrument.digits)}</b>
            </span>
            <span
              className={`font-semibold ${
                crosshairInfo.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {crosshairInfo.change >= 0 ? '+' : ''}
              {formatPrice(crosshairInfo.change, instrument.digits)}
            </span>
          </div>
        ) : latestQuote ? (
          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>
              24h High:{' '}
              <b className="text-emerald-400">{formatPrice(latestQuote.high24h, instrument.digits)}</b>
            </span>
            <span>
              24h Low:{' '}
              <b className="text-rose-400">{formatPrice(latestQuote.low24h, instrument.digits)}</b>
            </span>
            <span>
              Spread: <b className="text-slate-200">{latestQuote.spread}</b>
            </span>
          </div>
        ) : null}

        {/* Data Provider & Status */}
        <div className="flex items-center gap-2">
          {instrument.provider === 'BINANCE' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Binance Live Stream</span>
            </div>
          ) : latestQuote?.isMarketOpen ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Twelve Data Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
              <Clock className="w-3 h-3" />
              <span>Twelve Data (Market Closed)</span>
            </div>
          )}

          <button
            onClick={loadCandleData}
            title="Reload Chart Data"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Fullscreen"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div className="relative flex-1 w-full min-h-[420px]" ref={chartContainerRef}>
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090e1a]/70 backdrop-blur-[2px]">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <span className="text-xs text-slate-300 font-medium">
              Loading {symbol} OHLC Candlesticks...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#090e1a]/90">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Chart Data Temporarily Unavailable</h4>
            <p className="text-xs text-slate-400 max-w-md mb-4">{error}</p>
            <button
              onClick={loadCandleData}
              className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Watermark Logo */}
        <div className="absolute bottom-6 left-6 pointer-events-none z-10 select-none opacity-10">
          <div className="text-6xl font-black tracking-widest text-slate-100 uppercase">
            {symbol.replace('/', '')}
          </div>
          <div className="text-sm tracking-wider text-emerald-400 font-bold">
            WELLSTRADING TERMINAL
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
