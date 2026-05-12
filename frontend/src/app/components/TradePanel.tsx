"use client";

import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "./StatCard";
import { useAccountStore } from "../lib/store";
import { formatCurrency } from "@/lib/utils";

interface TradePanelProps {
  onTradeSuccess?: (trade: {
    dealId: string;
    direction: string;
    size: number;
    timestamp: string;
  }) => void;
}

export const TradePanel: React.FC<TradePanelProps> = ({
  onTradeSuccess
}) => {
  const { available_margin } = useAccountStore();
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
    // Evan: Using 10x leverage fallback for UI calculation
    return (Number(size) || 0) / 10;
  }, [size]);

  const formattedRequired = formatCurrency(marginRequired);
  const formattedAvailable = formatCurrency(available_margin);

  const handleTrade = async (direction: "BUY" | "SELL") => {
    setIsLoading(true);
    setStatus(null);
    try {
      const response = await fetch("http://localhost:4000/api/execute-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epic: "EURUSD",
          direction,
          size: size,
          sl: isSLActive && stopLoss ? parseFloat(stopLoss) : null,
          tp: isTPActive && takeProfit ? parseFloat(takeProfit) : null,
          currentPrice: 0, // Backend will fetch latest if needed
          requestId: crypto.randomUUID()
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || data.errorCode || "Trade failed");

      const newTrade = {
        dealId: data.dealReference,
        direction,
        size: size,
        timestamp: new Date().toLocaleTimeString(),
      };

      setStatus({
        message: `Success! Ref: ${newTrade.dealId}`,
        type: "success",
      });
      if (onTradeSuccess) onTradeSuccess(newTrade);
    } catch (error: any) {
      // Evan: Catching 400 errors and displaying broker details
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-white uppercase tracking-tighter">Manual Execution</h2>
      </div>

      <div className="space-y-6">
        {/* Size Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Size (Units)
          </label>
          <div className="relative">
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              min="1000"
              step="1000"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-xl"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
              Est. Margin €{formattedRequired} / €{formattedAvailable}
            </span>
          </div>
        </div>

        {/* SL/TP Toggles */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none"
                onClick={() => setIsSLActive(!isSLActive)}
              >
                <div className={cn("w-8 h-4 rounded-full transition-colors relative", isSLActive ? "bg-rose-500/40" : "bg-white/10")}>
                  <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform", isSLActive ? "translate-x-4" : "translate-x-0")} />
                </div>
                Stop Loss
              </label>
            </div>
            {isSLActive && (
              <input
                type="number" placeholder="Level (e.g. 1.1730)" value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)} step="0.0001"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none"
                onClick={() => setIsTPActive(!isTPActive)}
              >
                <div className={cn("w-8 h-4 rounded-full transition-colors relative", isTPActive ? "bg-emerald-500/40" : "bg-white/10")}>
                  <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform", isTPActive ? "translate-x-4" : "translate-x-0")} />
                </div>
                Take Profit
              </label>
            </div>
            {isTPActive && (
              <input
                type="number" placeholder="Level (e.g. 1.1850)" value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)} step="0.0001"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            )}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => handleTrade("BUY")} disabled={isLoading}
            className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
              <span className="uppercase tracking-tight">Buy EUR/USD</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50" />
          </button>

          <button
            onClick={() => handleTrade("SELL")} disabled={isLoading}
            className="w-full flex items-center justify-between bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingDown className="w-5 h-5" />}
              <span className="uppercase tracking-tight">Sell EUR/USD</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50" />
          </button>
        </div>

        {status && (
          <div className={cn("p-4 rounded-xl text-xs font-bold leading-relaxed border animate-in fade-in zoom-in-95", 
            status.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
            {status.type === 'error' && "❌ "} {status.message}
          </div>
        )}
      </div>
    </div>
  );
};
