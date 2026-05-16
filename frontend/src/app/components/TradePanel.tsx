"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Target,
  ArrowRight,
  Calculator,
  Terminal
} from "lucide-react";
import { cn } from "./StatCard";
import { useAccountStore } from "../lib/store";
import { io } from "socket.io-client";

interface TradePanelProps {
  onTradeSuccess?: (trade: {
    dealId: string;
    direction: string;
    size: number;
    timestamp: string;
  }) => void;
}

const formatCurrency = (val: number) => {
  const formatted = Math.abs(val).toFixed(2) + '€';
  return val > 0 ? `+${formatted}` : val < 0 ? `-${formatted}` : formatted;
};

export const TradePanel: React.FC<TradePanelProps> = ({
  onTradeSuccess
}) => {
  const { available_margin } = useAccountStore();
  const [epic, setEpic] = useState<string>("EURUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [size, setSize] = useState<number>(1000);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [livePrice, setLivePrice] = useState<number>(0);
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:4000");
    socket.on("price", (data: any) => {
      if (data.symbol === epic) {
        // estimated entry is the tradeable price
        setLivePrice(direction === 'BUY' ? data.ask : data.bid);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [epic, direction]);

  const marginRequired = useMemo(() => {
    return (Number(size) || 0) / 10;
  }, [size]);

  const potentials = useMemo(() => {
    const slNum = parseFloat(stopLoss);
    const tpNum = parseFloat(takeProfit);
    
    if (!livePrice || !slNum || !tpNum || !size) {
      return { profit: 0, loss: 0, ratio: 0 };
    }

    const isSell = direction === 'SELL';
    const rawProfitUSD = isSell ? (livePrice - tpNum) * size : (tpNum - livePrice) * size;
    const rawLossUSD = isSell ? (slNum - livePrice) * size : (livePrice - slNum) * size;
    
    const profit = rawProfitUSD / livePrice;
    const loss = Math.abs(rawLossUSD / livePrice);
    const ratio = loss > 0 ? (profit / loss).toFixed(1) : 0;
    
    return { 
      profit, 
      loss: -loss, 
      ratio 
    };
  }, [livePrice, stopLoss, takeProfit, size, direction]);

  const handleTrade = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const contextRes = await fetch(`http://localhost:4000/api/market/context?symbol=${epic}`);
      const contextData = await contextRes.json();
      const context_id = contextData.context_id;

      const response = await fetch("http://localhost:4000/api/execute-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epic,
          direction,
          size: size,
          sl: stopLoss ? parseFloat(stopLoss) : null,
          tp: takeProfit ? parseFloat(takeProfit) : null,
          currentPrice: livePrice,
          requestId: crypto.randomUUID(),
          context_id
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || data.errorCode || "Trade failed");

      setStatus({
        message: `Success! Ref: ${data.dealReference}`,
        type: "success",
      });
      if (onTradeSuccess) onTradeSuccess({
        dealId: data.dealReference,
        direction,
        size,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (error: any) {
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col h-full">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-tighter">Manual Order</h2>
          </div>
        </div>

        {/* Direction Toggle at the TOP */}
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 shadow-inner">
          <button 
            onClick={() => setDirection('BUY')}
            className={cn(
              "flex-1 py-3 rounded-lg text-[10px] font-black transition-all uppercase tracking-[0.1em] flex items-center justify-center gap-2", 
              direction === 'BUY' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <TrendingUp className="w-3 h-3" />
            Buy / Long
          </button>
          <button 
            onClick={() => setDirection('SELL')}
            className={cn(
              "flex-1 py-3 rounded-lg text-[10px] font-black transition-all uppercase tracking-[0.1em] flex items-center justify-center gap-2", 
              direction === 'SELL' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <TrendingDown className="w-3 h-3" />
            Sell / Short
          </button>
        </div>
      </div>

      <div className="space-y-6 flex-grow overflow-y-auto pr-2 custom-scrollbar mt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Instrument</label>
            <div className="relative">
              <select
                value={epic}
                onChange={(e) => setEpic(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all text-xs appearance-none cursor-pointer"
              >
                <option value="EURUSD">EUR / USD</option>
                <option value="GBPUSD">GBP / USD</option>
                <option value="USDJPY">USD / JPY</option>
                <option value="AUDUSD">AUD / USD</option>
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Size (Units)</label>
            <input
              type="number" value={size} onChange={(e) => setSize(Number(e.target.value))} min="1000" step="1000"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Stop Loss</span>
            </div>
            <input
              type="number" placeholder="0.00000" value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)} step="0.0001"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Take Profit</span>
            </div>
            <input
              type="number" placeholder="0.00000" value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)} step="0.0001"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Est. Outcome Section */}
        <div className="p-5 rounded-2xl bg-blue-600/5 border border-blue-500/20 shadow-inner space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.1em]">Est. Outcome</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-slate-500 font-bold uppercase">R:R Ratio</span>
              <span className="text-[10px] font-mono font-black text-white bg-white/5 px-1.5 py-0.5 rounded border border-white/10">1:{potentials.ratio}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-widest">Reward</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-mono font-black text-emerald-400">{formatCurrency(potentials.profit)}</span>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-widest">Risk</span>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-mono font-black text-rose-400">{formatCurrency(potentials.loss)}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Required Margin</span>
            <span className="text-xs font-mono text-white font-bold tracking-tighter">€{(size/10).toFixed(2)}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleTrade} disabled={isLoading || livePrice === 0 || !direction}
            className={cn(
              "w-full group flex items-center justify-center gap-4 py-5 rounded-2xl text-white font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden relative shadow-2xl",
              direction === 'BUY' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (direction === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />)}
            <span className="uppercase tracking-[0.2em] relative z-10">Execute {direction === 'BUY' ? 'Long' : 'Short'} Position</span>
          </button>
        </div>

        {status && (
          <div className={cn("p-4 rounded-xl text-[10px] font-bold leading-relaxed border animate-in fade-in zoom-in-95", 
            status.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
            {status.type === 'error' ? "⚠️ SYSTEM ERROR: " : "✅ SUCCESS: "} {status.message}
          </div>
        )}
      </div>
    </div>
  );
};