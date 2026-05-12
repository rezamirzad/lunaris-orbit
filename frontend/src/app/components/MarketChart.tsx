"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  ColorType,
  CandlestickSeries,
  CrosshairMode,
} from "lightweight-charts";

interface MarketChartProps {
  data: CandlestickData<Time>[];
  liveTick?: CandlestickData<Time>;
}

/**
 * MarketChart Component
 * 
 * Integrated by Ian (Performance Benchmarker)
 * Updated by Evan (Frontend Developer) for Lightweight Charts v5 compatibility.
 * Optimized for high-frequency updates and low-latency rendering.
 * Uses TradingView Lightweight Charts for canvas-based performance.
 */
export const MarketChart: React.FC<MarketChartProps> = ({ data, liveTick }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#707a8a",
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "#161b22" },
        horzLines: { color: "#161b22" },
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(5), // Evan: Force 5 decimals for Forex
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        autoScale: true,
        alignLabels: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.2)",
          labelBackgroundColor: "#4c525e",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.2)",
          labelBackgroundColor: "#4c525e",
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    // Add Candlestick Series (v5 Unified API)
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a", // Evan: Premium TradingView Teal
      downColor: "#ef5350", // Evan: Premium TradingView Red
      borderVisible: false, // Clean, modern look
      wickVisible: true,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Load initial data
    if (data && data.length > 0) {
      // Ian's Performance Safeguard: Filter empty candles and strictly format timestamps
      const formattedData = data
        .filter(item => item.close > 0 && item.open > 0)
        .map(item => ({
          ...item,
          time: (typeof item.time === 'string' 
            ? Math.floor(new Date(item.time).getTime() / 1000) 
            : item.time) as Time
        }));
      
      console.log("Chart Data Check [Ian]:", formattedData[0]);
      series.setData(formattedData);
      
      // Ian: Set initial visible range to focus on recent action (last 100 bars)
      requestAnimationFrame(() => {
        chart.timeScale().setVisibleLogicalRange({ 
          from: formattedData.length - 100, 
          to: formattedData.length 
        });
      });
    }

    chartRef.current = chart;
    seriesRef.current = series;

    // Responsive Resizing Logic
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []); // Run once on mount

  // Performance-optimized data synchronization
  useEffect(() => {
    if (seriesRef.current && data) {
      const formattedData = data
        .filter(item => item.close > 0 && item.open > 0)
        .map(item => ({
          ...item,
          time: (typeof item.time === 'string' 
            ? Math.floor(new Date(item.time).getTime() / 1000) 
            : item.time) as Time
        }));
      console.log("Chart Data Update [Ian]:", formattedData[0]);
      seriesRef.current.setData(formattedData);
    }
  }, [data]);

  // Real-time tick update (p99 latency critical path)
  useEffect(() => {
    if (seriesRef.current && liveTick) {
      seriesRef.current.update(liveTick);
    }
  }, [liveTick]);

  return (
    <div className="relative w-full h-full min-h-[400px] p-4 rounded-xl border border-white/10 bg-black/20 backdrop-blur-md overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Live Market Feed
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          TV-LW-CHART V4.1
        </div>
      </div>
      <div ref={chartContainerRef} className="flex-grow w-full" />
    </div>
  );
};
