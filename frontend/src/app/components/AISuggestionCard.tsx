import React, { useState, useEffect } from "react";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Target,
  Activity,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { cn } from "./StatCard";

interface AISuggestion {
  id: string;
  pair: string;
  action: "BUY" | "SELL" | "HOLD";
  amount: number;
  stop_loss: number;
  take_profit: number;
  confidence_score: number;
  reasoning: string;
  context_id?: string;
  context_log_id?: string;
  raw_ai_response?: any;
  entry_price?: number;
}

interface AISuggestionCardProps {
  contextData: any;
  suggestion: AISuggestion | null;
  isLoading: boolean;
  onPrepareContext: () => void;
  onGenerate: () => void;
  onExecute: (suggestion: AISuggestion) => void;
  onReject: (suggestion: AISuggestion) => void;
}

const formatCurrency = (val: number) => {
  const formatted = Math.abs(val).toFixed(2) + '€';
  return val > 0 ? `+${formatted}` : val < 0 ? `-${formatted}` : formatted;
};

const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(val);

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  contextData,
  suggestion,
  isLoading,
  onPrepareContext,
  onGenerate,
  onExecute,
  onReject,
}) => {
  const [editSize, setEditSize] = useState<number>(0);
  const [editSL, setEditSL] = useState<number>(0);
  const [editTP, setEditTP] = useState<number>(0);

  useEffect(() => {
    if (suggestion) {
      setEditSize(suggestion.amount);
      setEditSL(suggestion.stop_loss);
      setEditTP(suggestion.take_profit);
    }
  }, [suggestion]);

  const calculatePotential = () => {
    if (!suggestion) return { profit: 0, loss: 0 };
    const { action, raw_ai_response, entry_price } = suggestion;
    
    // Prefer explicitly saved entry_price, fallback to raw_ai_response, or context data
    const entry = entry_price || raw_ai_response?.entry || contextData?.current_price;
    
    if (!entry || !editSL || !editTP || !editSize) return { profit: 0, loss: 0, entry };

    const isSell = action === 'SELL';
    
    // Projections strictly based on entryPrice to ensure static figures
    const rawProfitUSD = isSell ? (entry - editTP) * editSize : (editTP - entry) * editSize;
    const rawLossUSD = isSell ? (editSL - entry) * editSize : (entry - editSL) * editSize;
    
    // Convert to account currency (EUR) assuming entry is EUR/USD rate
    return { 
      profit: rawProfitUSD / entry, 
      loss: rawLossUSD / entry,
      entry
    };
  };

  const { profit, loss, entry } = calculatePotential();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-md flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          AI Consulting
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onPrepareContext}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 transition-all text-xs font-bold disabled:opacity-50"
          >
            {isLoading && !contextData ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Target className="w-3 h-3" />
            )}
            Fetch Context
          </button>
          <button
            onClick={onGenerate}
            disabled={isLoading || !contextData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
          >
            {isLoading && contextData ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            Consult AI
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col overflow-y-auto">
        {!contextData && !isLoading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">
              No active context. Click "Fetch Context" to retrieve raw market data before consulting the AI Strategist.
            </p>
          </div>
        ) : contextData && !suggestion && !isLoading ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-sm text-slate-300 font-bold">Context Retrieved Successfully</p>
              <p className="text-xs text-slate-500 mb-4">You can now pass this data to the AI for analysis.</p>
            </div>
            {contextData.context ? (
              <div className="p-4 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-emerald-500/80 overflow-x-auto max-h-[32rem] scrollbar-hide">
                <pre>{JSON.stringify(contextData.context, null, 2)}</pre>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs text-center font-bold">
                ⚠️ JSON context data is missing from the response.
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-white/5 rounded w-1/3 mx-auto"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-white/5 rounded"></div>
              <div className="h-16 bg-white/5 rounded"></div>
              <div className="h-16 bg-white/5 rounded"></div>
            </div>
            <div className="h-20 bg-white/5 rounded"></div>
          </div>
        ) : suggestion ? (
          <div className="space-y-6">
            <div className="text-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xl font-black uppercase tracking-tight mb-2",
                  suggestion.action === "BUY"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : suggestion.action === "SELL"
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-white/10 text-slate-400",
                )}
              >
                {suggestion.action === "BUY" ? (
                  <TrendingUp className="w-6 h-6" />
                ) : suggestion.action === "SELL" ? (
                  <TrendingDown className="w-6 h-6" />
                ) : (
                  <Minus className="w-6 h-6" />
                )}
                {suggestion.action} {suggestion.pair}
              </div>

              <div className="flex items-center justify-center gap-4 mt-4 mb-2">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300 uppercase tracking-widest">
                  Confidence
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-md border text-xs font-extrabold shadow-sm",
                      suggestion.confidence_score > 70
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : suggestion.confidence_score > 40
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30",
                    )}
                  >
                    {suggestion.confidence_score}%
                  </span>
                </div>
              </div>
            </div>

            {suggestion.action !== 'HOLD' && (
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                    Entry
                  </span>
                  <span className="text-xs font-mono text-white">
                    {entry ? formatPrice(entry) : 'Market'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-500 uppercase font-black px-1">Size</span>
                  <input 
                    type="number" value={editSize} onChange={(e) => setEditSize(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-500/70 uppercase font-black">TP</span>
                  </div>
                  <input 
                    type="number" step="0.0001" value={editTP} onChange={(e) => setEditTP(Number(e.target.value))}
                    className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ShieldCheck className="w-3 h-3 text-rose-500" />
                    <span className="text-[10px] text-rose-500/70 uppercase font-black">SL</span>
                  </div>
                  <input 
                    type="number" step="0.0001" value={editSL} onChange={(e) => setEditSL(Number(e.target.value))}
                    className="w-full bg-rose-500/5 border border-rose-500/20 rounded-lg p-2 text-xs font-mono text-rose-400 focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>
            )}

            {suggestion.action !== 'HOLD' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <span className="block text-[9px] text-emerald-500/70 uppercase font-black mb-1">Potential Profit</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(profit)}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-center">
                  <span className="block text-[9px] text-rose-500/70 uppercase font-black mb-1">Potential Loss</span>
                  <span className="text-sm font-mono font-bold text-rose-400">{formatCurrency(loss)}</span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <span className="block text-[10px] text-blue-400 uppercase font-black mb-1">
                Key Driver
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{suggestion.reasoning}"
              </p>
            </div>

            <div className="flex gap-3">
              {suggestion.action !== 'HOLD' && (
                <button
                  onClick={() => onExecute({
                    ...suggestion,
                    amount: editSize,
                    stop_loss: editSL,
                    take_profit: editTP
                  })}
                  className="flex-[2] group flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  Execute Trade
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              <button
                onClick={() => onReject(suggestion)}
                className={cn("flex-1 py-4 rounded-xl bg-white/5 text-slate-400 font-bold text-sm hover:bg-white/10 transition-all", suggestion.action === 'HOLD' ? 'flex-[3]' : '')}
              >
                {suggestion.action === 'HOLD' ? 'Acknowledge & Dismiss' : 'Dismiss'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
