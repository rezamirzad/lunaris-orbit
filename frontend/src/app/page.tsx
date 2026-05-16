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
  ShieldCheck,
} from "lucide-react";
import { StatCard, cn } from "./components/StatCard";
import { PriceDisplay } from "./components/PriceDisplay";
import { TradePanel } from "./components/TradePanel";
import { TradeHistory } from "./components/TradeHistory";
import { PortfolioView } from "./components/PortfolioView";
import { MarketChart } from "./components/MarketChart";
import { OrbitCommand } from "./components/OrbitCommand";
import { TopNavbar } from "./components/TopNavbar";
import { AISuggestionCard } from "./components/AISuggestionCard";
import { ActiveAnalystWidget } from "./components/ActiveAnalystWidget";
import { useAccountStore } from "./lib/store";
import { io } from "socket.io-client";

export default function Dashboard() {
  const { fetchAccountLive } = useAccountStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [liveTick, setLiveTick] = useState<any>(null);

  // AI Suggestion State
  const [contextData, setContextData] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const handlePrepareContext = async () => {
    setIsAiLoading(true);
    setContextData(null);
    setSuggestion(null);
    try {
      const response = await fetch(
        "http://localhost:4000/api/market/context?symbol=EURUSD",
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch context");
      }

      setContextData(data);
    } catch (err: any) {
      console.error("Failed to fetch context:", err);
      alert(`CONTEXT ERROR: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateSuggestion = async () => {
    if (!contextData) return;
    setIsAiLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "EURUSD",
          context_id: contextData.context_id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI Consultation failed");
      }

      setSuggestion(data.suggestion);
    } catch (err: any) {
      console.error("Failed to generate suggestion:", err);
      alert(`AI ERROR: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExecuteSuggestion = async (suggestion: any) => {
    try {
      if (suggestion.id) {
        await fetch("http://localhost:4000/api/ai/confirm-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: suggestion.id, is_confirmed: true }),
        }).catch((err) => console.error("Failed to confirm suggestion:", err));
      }

      const response = await fetch("http://localhost:4000/api/execute-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epic: "EURUSD",
          direction: suggestion.action,
          size: suggestion.amount,
          sl: suggestion.stop_loss,
          tp: suggestion.take_profit,
          currentPrice: liveTick?.bid || suggestion.entry_price || suggestion.raw_ai_response?.entry,
          requestId: crypto.randomUUID(),
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence_score,
          suggestion_id: suggestion.id,
          context_id: suggestion.context_log_id || suggestion.context_id,
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
        setSuggestion(null); // Clear suggestion after execution
      } else {
        // Evan: Catching 400 errors from backend (Diana) and displaying broker message
        alert(`BROKER ERROR: ${data.error || "Execution failed"}`);
      }
    } catch (err) {
      console.error("Execution Error:", err);
    }
  };

  const handleRejectSuggestion = async (suggestion: any) => {
    if (suggestion?.id) {
      try {
        await fetch("http://localhost:4000/api/ai/confirm-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: suggestion.id, is_confirmed: false }),
        });
        setSuggestion(null); // Clear after rejection
      } catch (err) {
        console.error("Failed to reject suggestion:", err);
      }
    } else {
      setSuggestion(null);
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
              <PriceDisplay />

              <AISuggestionCard
                contextData={contextData}
                suggestion={suggestion}
                isLoading={isAiLoading}
                onPrepareContext={handlePrepareContext}
                onGenerate={handleGenerateSuggestion}
                onExecute={handleExecuteSuggestion}
                onReject={handleRejectSuggestion}
              />

              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col justify-center items-center text-center">
                  <Activity className="w-8 h-8 text-blue-500 mb-4 animate-pulse" />
                  <h4 className="text-white font-bold mb-2 uppercase tracking-widest text-xs">System Health</h4>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    Institutional execution pipeline active. <br />
                    WebSocket latency: <span className="text-emerald-500 font-mono">24ms</span>
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col justify-center items-center text-center opacity-50">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mb-4" />
                  <h4 className="text-white font-bold mb-2 uppercase tracking-widest text-xs">Compliance Audit</h4>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    All actions are append-only. <br />
                    FCA/SEC reporting protocol enabled.
                  </p>
                </div>
              </div> */}

              <PortfolioView />

              <TradeHistory />
            </div>

            {/* Right Column: AI Analysis (Top) & Manual Execute (Bottom) */}
            <div className="xl:col-span-4 space-y-6 sticky top-6 self-start">
              <ActiveAnalystWidget />

              <TradePanel onTradeSuccess={handleTradeSuccess} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
