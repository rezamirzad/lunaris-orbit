"use client";

import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
  ShieldCheck,
  Target,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { cn } from "./StatCard";

interface TradePanelProps {
  onTradeSuccess?: (trade: {
    dealId: string;
    direction: string;
    size: number;
    timestamp: string;
  }) => void;
  account?: any;
}

export const TradePanel: React.FC<TradePanelProps> = ({
  onTradeSuccess,
  account,
}) => {
  const [size, setSize] = useState<number>(1000);
  const [isSLActive, setIsSLActive] = useState(false);
  const [isTPActive, setIsTPActive] = useState(false);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const marginRequired = useMemo(() => {
    const numericSize = Number(size) || 0;

    // 1. Pull the factor
    const brokerFactor = account?.marketDetails?.instrument?.marginFactor;

    // 2. The Logic Filter:
    // If brokerFactor is 100, it's usually a generic 'placeholder'
    // for an account that hasn't loaded market-specific rules yet.
    // We only use the calculation if brokerFactor is a 'real' leverage value (e.g., 3.33 or 10).
    const leverage =
      brokerFactor && brokerFactor < 100 ? 100 / brokerFactor : 10; // Fallback to 10x leverage for the UI

    const result = numericSize / leverage;

    console.log(
      `Final Decision: Using ${leverage}x leverage. Factor was: ${brokerFactor}. Result: ${result}`,
    );
    return result;
  }, [size, account]);

  const availableFunds = account?.accountInfo?.available || 0;
  const formattedRequired = marginRequired.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
  });
  const formattedAvailable = availableFunds.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
  });

  const handleTrade = async (direction: "BUY" | "SELL") => {
    setIsLoading(true);
    setStatus(null);
    try {
      const response = await fetch("http://localhost:4000/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          size: size,
          stopLoss: isSLActive && stopLoss ? parseFloat(stopLoss) : null,
          takeProfit: isTPActive && takeProfit ? parseFloat(takeProfit) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Trade failed");

      const newTrade = {
        dealId: data.dealId || Math.random().toString(36).substr(2, 9),
        direction,
        size: size,
        timestamp: new Date().toLocaleTimeString(),
      };

      setStatus({
        message: `Success! ID: ${newTrade.dealId}`,
        type: "success",
      });
      if (onTradeSuccess) onTradeSuccess(newTrade);
    } catch (error: any) {
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-white">Execute Trade</h2>
      </div>

      <div className="space-y-6">
        {/* Size Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Size (EUR)
          </label>
          <div className="relative">
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              min="100"
              step="100"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-xl"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-500 uppercase font-medium">
              Margin required €{formattedRequired} / €{formattedAvailable}
            </span>
          </div>
        </div>

        {/* SL/TP Toggles */}
        <div className="space-y-3">
          {/* Stop Loss Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => setIsSLActive(!isSLActive)}
              >
                <div
                  className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    isSLActive ? "bg-rose-500/40" : "bg-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                      isSLActive ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </div>
                Stop Loss
              </label>
            </div>
            {isSLActive && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="number"
                  placeholder="Price Level"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  step="0.0001"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all"
                />
              </div>
            )}
          </div>

          {/* Take Profit Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => setIsTPActive(!isTPActive)}
              >
                <div
                  className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    isTPActive ? "bg-emerald-500/40" : "bg-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                      isTPActive ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </div>
                Take Profit
              </label>
            </div>
            {isTPActive && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="number"
                  placeholder="Price Level"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  step="0.0001"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* Execution Buttons - Full Width */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => handleTrade("BUY")}
            disabled={isLoading}
            className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
              <span>Buy EUR/USD</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50" />
          </button>

          <button
            onClick={() => handleTrade("SELL")}
            disabled={isLoading}
            className="w-full flex items-center justify-between bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-rose-900/20 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span>Sell EUR/USD</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50" />
          </button>
        </div>

        {status && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2",
              status.type === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400",
            )}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};
