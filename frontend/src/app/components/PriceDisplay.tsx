"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from "lucide-react";
import { io } from "socket.io-client";
import { cn } from "./StatCard";

interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
}

const formatPriceWithContext = (val: number, symbol: string) => {
  const digits = symbol.includes('JPY') ? 3 : 5;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(val);
};

const PriceCard: React.FC<{ price: PriceUpdate }> = ({ price }) => {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevBid = useRef<number>(price.bid);
  const flashTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (price.bid > prevBid.current) {
      triggerFlash("up");
    } else if (price.bid < prevBid.current) {
      triggerFlash("down");
    }
    prevBid.current = price.bid;
  }, [price.bid]);

  const triggerFlash = (direction: "up" | "down") => {
    setFlash(direction);
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    flashTimeout.current = setTimeout(() => setFlash(null), 800);
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-300 bg-white/5 backdrop-blur-sm flex flex-col gap-2",
        flash === "up" ? "border-emerald-500/50 bg-emerald-500/5" : 
        flash === "down" ? "border-rose-500/50 bg-rose-500/5" : "border-white/10"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{price.symbol.replace('USD', '/USD').replace('JPY', '/JPY')}</span>
        <div className="flex items-center gap-1">
          {flash === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
          {flash === "down" && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
        </div>
      </div>
      
      <div className="flex items-baseline justify-between">
        <span className={cn(
          "text-xl font-mono font-black transition-colors duration-300",
          flash === "up" ? "text-emerald-500" : flash === "down" ? "text-rose-500" : "text-white"
        )}>
          {formatPriceWithContext(price.bid, price.symbol)}
        </span>
        <span className="text-[10px] text-blue-400 font-bold bg-blue-400/10 px-1.5 py-0.5 rounded">
          {((price.ask - price.bid) * (price.symbol.includes('JPY') ? 100 : 10000)).toFixed(1)}
        </span>
      </div>
    </div>
  );
};

export const PriceDisplay: React.FC = () => {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  useEffect(() => {
    const socket = io("http://localhost:4000");

    socket.on("price", (data: PriceUpdate) => {
      setPrices((prev) => ({
        ...prev,
        [data.symbol]: data
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const symbols = Object.keys(prices).sort();

  if (symbols.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center gap-3 animate-pulse">
        <Activity className="w-5 h-5 text-blue-500 animate-spin" />
        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Connecting to Capital.com High-Frequency Stream...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-black text-white uppercase tracking-tighter">Market Pulse (Real-Time)</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {symbols.map((symbol) => (
          <PriceCard key={symbol} price={prices[symbol]} />
        ))}
      </div>
    </div>
  );
};
