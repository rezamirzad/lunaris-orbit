"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  BarChart3,
  Layers,
  Settings,
  LogOut,
  Menu,
  PieChart,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { StatCard, cn } from "./components/StatCard";
import { PriceDisplay } from "./components/PriceDisplay";
import { TradePanel } from "./components/TradePanel";
import { PortfolioView } from "./components/PortfolioView";
import { MarketChart } from "./components/MarketChart";
import { OrbitCommand } from "./components/OrbitCommand";
import { TopNavbar } from "./components/TopNavbar";
import { useAccountStore } from "./lib/store";
import { io } from "socket.io-client";

export default function Dashboard() {
  const { fetchAccountLive } = useAccountStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [liveTick, setLiveTick] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [resolution, setResolution] = useState("MINUTE");

  // 1. Unified P&L Hydration (Diana & Evan)
  useEffect(() => {
    fetchAccountLive();
    const interval = setInterval(fetchAccountLive, 2000); // 2s short-polling
    return () => clearInterval(interval);
  }, [fetchAccountLive]);

  // Real-time tick updates via Socket.io
  useEffect(() => {
    const socket = io("http://localhost:4000");
    socket.on("price", (data: any) => {
      setLiveTick({
        time: data.time,
        open: data.bid,
        high: data.ask,
        low: data.bid,
        close: data.bid,
        bid: data.bid,
        ask: data.ask,
      });
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleTradeSuccess = (trade: any) => {
    setRecentTrades((prev) => [trade, ...prev].slice(0, 5));
    fetchAccountLive(); // Immediate refresh
  };

  const handleExecuteSuggestion = async (suggestion: any) => {
    try {
      const response = await fetch("http://localhost:4000/api/execute-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epic: "EURUSD",
          direction: suggestion.action,
          size: suggestion.amount,
          sl: suggestion.stop_loss,
          tp: suggestion.take_profit,
          currentPrice: liveTick?.bid || 0,
          requestId: crypto.randomUUID(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        handleTradeSuccess({
          dealId: data.dealReference,
          direction: suggestion.action,
          size: suggestion.amount,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        // Evan: Catching 400 errors from backend (Diana) and displaying broker message
        alert(`BROKER ERROR: ${data.error || "Execution failed"}`);
      }
    } catch (err) {
      console.error("Execution Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-200 font-sans selection:bg-blue-500/30 flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} w-64 border-r border-white/5 bg-[#09090b] hidden lg:block`}
      >
        <div className="flex flex-col h-full px-4 py-6">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              LUNARIS
            </span>
          </div>
          <nav className="flex-1 space-y-1">
            {[
              { icon: BarChart3, label: "Dashboard", active: true },
              { icon: ArrowRightLeft, label: "Trade History" },
              { icon: PieChart, label: "Portfolio" },
              { icon: Settings, label: "Settings" },
            ].map((item) => (
              <button
                key={item.label}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${item.active ? "bg-white/5 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="pt-6 border-t border-white/5">
            <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "ml-0"}`}
      >
        <TopNavbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Column: Data & Portfolio (8 Units) */}
            <div className="xl:col-span-8 space-y-6">
              <div className="flex-1 min-h-0">
                <OrbitCommand
                  onExecute={handleExecuteSuggestion}
                  onReject={() => {}}
                  currentPrice={liveTick?.bid}
                />
              </div>

              <PortfolioView />

              <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <h3 className="font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-0">
                  {recentTrades.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-12 italic">
                      No recent execution history.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {recentTrades.map((trade) => (
                        <div
                          key={trade.dealId}
                          className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                trade.direction === "BUY"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-rose-500/10 text-rose-500",
                              )}
                            >
                              {trade.direction === "BUY" ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">
                                EUR/USD {trade.direction}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                ID: {trade.dealId}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">
                              {trade.size.toLocaleString("en-US")} Units
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                              {trade.timestamp}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Orbit Command (Top) & Execute Trade (Bottom) */}
            <div className="xl:col-span-4 space-y-6 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <PriceDisplay />

              <TradePanel onTradeSuccess={handleTradeSuccess} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
