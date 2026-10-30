import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, CrosshairMode } from 'lightweight-charts';
import { CandleData, Instrument, MarketQuote, Timeframe } from '@/types';
import { MarketDataService } from '@/services/marketData';
import { formatPrice } from '@/lib/instruments';
import { RefreshCw, Maximize2, Minimize2, Radio, Activity } from 'lucide-react';

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
  const currentIntervalSecRef = useRef<number>(60);

  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
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

  const timeframes: { label: string; value: Timeframe; sec: number }[] = [
    { label: '1m', value: '1m', sec: 60 },
    { label: '5m', value: '5m', sec: 300 },
    { label: '15m', value: '15m', sec: 900 },
    { label: '1h', value: '1h', sec: 3600 },
    { label: '4h', value: '4h', sec: 14400 },
    { label: '1D', value: '1d', sec: 86400 },
  ];

  // Fetch candle data and render chart
  const loadCandleData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const candles = await MarketDataService.getCandles(symbol, timeframe);

      if (!candles || candles.length === 0) {
        throw new Error(`No candle data for ${symbol}`);
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
            color: c.close >= c.open ? 'rgba(0, 229, 153, 0.25)' : 'rgba(255, 67, 101, 0.25)',
          }));
          volumeSeriesRef.current.setData(volumeData);
        }

        lastCandleRef.current = candles[candles.length - 1];
        chartRef.current.timeScale().fitContent();
      }
    } catch (err: any) {
      console.warn('Error loading candles:', err);
      setError(err.message || 'Failed to fetch algorithmic market data');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  // Handle timeframe change
  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    const found = timeframes.find((t) => t.value === tf);
    if (found) {
      currentIntervalSecRef.current = found.sec;
    }
  };

  // Initialize Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 480,
      layout: {
        background: { color: '#070b14' },
        textColor: '#64748b',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.35)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.35)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#38bdf8',
          width: 1,
          style: 3,
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
          top: 0.08,
          bottom: 0.18,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00e599',
      downColor: '#ff4365',
      borderUpColor: '#00e599',
      borderDownColor: '#ff4365',
      wickUpColor: '#00e599',
      wickDownColor: '#ff4365',
      priceLineVisible: true,
      lastValueVisible: true,
      priceLineWidth: 1,
      priceLineColor: '#38bdf8',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    chartRef.current = chart;

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
          const dateStr =
            typeof param.time === 'number'
              ? new Date(param.time * 1000).toLocaleTimeString()
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

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height: height || 480 });
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

  // Real-time second-by-second live candle update with zero lag
  useEffect(() => {
    const handleTick = (newQuote: MarketQuote) => {
      if (!candleSeriesRef.current || !lastCandleRef.current) return;

      const currentPrice = newQuote.price;
      const nowSec = Math.floor(Date.now() / 1000);
      const intervalSec = currentIntervalSecRef.current;
      const currentBarStart = Math.floor(nowSec / intervalSec) * intervalSec;

      const last = lastCandleRef.current;

      if (last.time === currentBarStart) {
        // Update ongoing current candle
        const updatedCandle: CandleData = {
          ...last,
          close: currentPrice,
          high: Math.max(last.high, currentPrice),
          low: Math.min(last.low, currentPrice),
          volume: (last.volume || 1) + 1,
        };
        lastCandleRef.current = updatedCandle;

        candleSeriesRef.current.update({
          time: updatedCandle.time as UTCTimestamp,
          open: updatedCandle.open,
          high: updatedCandle.high,
          low: updatedCandle.low,
          close: updatedCandle.close,
        });

        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: updatedCandle.time as UTCTimestamp,
            value: updatedCandle.volume || 1,
            color: updatedCandle.close >= updatedCandle.open ? 'rgba(0, 229, 153, 0.35)' : 'rgba(255, 67, 101, 0.35)',
          });
        }
      } else if (currentBarStart > last.time) {
        // New candle interval started! Advance chart and create next candlestick bar
        const newCandle: CandleData = {
          time: currentBarStart,
          open: last.close,
          high: Math.max(last.close, currentPrice),
          low: Math.min(last.close, currentPrice),
          close: currentPrice,
          volume: 1,
        };
        lastCandleRef.current = newCandle;

        candleSeriesRef.current.update({
          time: newCandle.time as UTCTimestamp,
          open: newCandle.open,
          high: newCandle.high,
          low: newCandle.low,
          close: newCandle.close,
        });

        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: newCandle.time as UTCTimestamp,
            value: 1,
            color: newCandle.close >= newCandle.open ? 'rgba(0, 229, 153, 0.35)' : 'rgba(255, 67, 101, 0.35)',
          });
        }
      }
    };

    // Direct high-frequency subscription ensures zero-latency 1s ticks without parent re-render lag
    const unsubscribe = MarketDataService.subscribeQuote(symbol, handleTick);

    // Also respond to latestQuote prop if passed
    if (latestQuote) {
      handleTick(latestQuote);
    }

    return () => {
      unsubscribe();
    };
  }, [symbol, timeframe, latestQuote]);

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
    <div className="relative flex flex-col w-full h-full bg-[#070b14] rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Minimalist Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-[#090e1a]/90 text-xs gap-2">
        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => handleTimeframeChange(tf.value)}
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

        {/* OHLC Bar Stats */}
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

        {/* Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Synchronized 1-sec algorithmic engine badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Algorithmic Live 1s</span>
          </div>

          <button
            onClick={loadCandleData}
            title="Reload Chart Data"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative flex-1 w-full min-h-[440px]" ref={chartContainerRef}>
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070b14]/70 backdrop-blur-[2px]">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <span className="text-xs text-slate-300 font-medium">
              Generating {symbol} Chart Stream...
            </span>
          </div>
        )}

        {/* Subtle Watermark */}
        <div className="absolute bottom-6 left-6 pointer-events-none z-10 select-none opacity-5">
          <div className="text-7xl font-black tracking-widest text-white uppercase">
            {symbol.replace('/', '')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
