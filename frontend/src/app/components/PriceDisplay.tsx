"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { io } from "socket.io-client";
import { cn } from "./StatCard";
import { formatPrice } from "@/lib/utils";

interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
}

export const PriceDisplay: React.FC = () => {
  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const flashTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:4000");

    socket.on("price", (data: PriceUpdate) => {
      setPrice((current) => {
        if (current && data.bid > current.bid) {
          triggerFlash("up");
        } else if (current && data.bid < current.bid) {
          triggerFlash("down");
        }
        return data;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const triggerFlash = (direction: "up" | "down") => {
    setFlash(direction);
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    flashTimeout.current = setTimeout(() => setFlash(null), 1000);
  };

  if (!price) {
    return (
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-400">
            EUR/USD Establishing Connection
          </span>
        </div>
        <div className="h-8 w-32 bg-white/10 rounded"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-6 rounded-xl border transition-colors duration-500",
        flash === "up"
          ? "border-emerald-500/50 bg-emerald-500/5"
          : flash === "down"
            ? "border-rose-500/50 bg-rose-500/5"
            : "border-white/10 bg-white/5 backdrop-blur-md",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity
            className={cn(
              "w-4 h-4 transition-colors",
              flash === "up"
                ? "text-emerald-500"
                : flash === "down"
                  ? "text-rose-500"
                  : "text-slate-400",
            )}
          />
          <span className="text-sm font-medium text-slate-400">
            EUR/USD Live
          </span>
        </div>
        <div className="flex items-center gap-1">
          {flash === "up" && (
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          )}
          {flash === "down" && (
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "text-3xl font-bold transition-colors duration-300",
            flash === "up"
              ? "text-emerald-500"
              : flash === "down"
                ? "text-rose-500"
                : "text-white",
          )}
        >
          {formatPrice(price.bid)}
        </span>
        <div className="flex gap-4 mt-2 text-xs font-mono items-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
              Bid
            </span>
            <span className="text-slate-300">{formatPrice(price.bid)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
              Ask
            </span>
            <span className="text-slate-300">{formatPrice(price.ask)}</span>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <span className="text-[10px] text-blue-500 uppercase tracking-tighter font-bold">
              Spread
            </span>
            <span className="text-blue-300 font-bold bg-blue-500/10 rounded">
              {((price.ask - price.bid) * 10000).toFixed(1)} pips
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
