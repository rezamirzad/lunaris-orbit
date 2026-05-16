import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Brain, 
  Terminal, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  ShieldCheck,
  Target,
  Code,
  Copy,
  Check,
  Rocket,
  Euro,
  Scale,
  Loader2
} from 'lucide-react';
import { cn } from './StatCard';

const formatCurrency = (val: number) => {
  const formatted = Math.abs(val).toFixed(2) + '€';
  return val > 0 ? `+${formatted}` : val < 0 ? `-${formatted}` : formatted;
};

const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(val);

interface AISuggestion {
  id: string;
  pair: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;
  stop_loss: number;
  take_profit: number;
  confidence_score: number;
  reasoning: string;
  context_id?: string;
  context_log_id?: string;
}

interface OrbitCommandProps {
  onExecute: (suggestion: AISuggestion) => void;
  onReject: (suggestion: AISuggestion) => void;
  currentPrice?: number;
}

export const OrbitCommand: React.FC<OrbitCommandProps> = ({ onExecute, onReject, currentPrice }) => {
  const [epic, setEpic] = useState<string>("EURUSD");
  const [context, setContext] = useState<any>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Editable Fields
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

  const prepareContext = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:4000/api/market/context?symbol=${epic}`);
      if (!response.ok) throw new Error('Failed to prepare context');
      const data = await response.json();
      setContext(data.context);
      setContextId(data.context_id);
      setShowContext(true);
    } catch (err: any) {
      console.error('Failed to prepare context:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!context) return;
    navigator.clipboard.writeText(JSON.stringify(context, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const consultGemini = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:4000/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: epic, context_id: contextId })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'AI Consultation failed');
      }
      const data = await response.json();
      setSuggestion(data.suggestion);
    } catch (err: any) {
      console.error('AI Consultation failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePotential = () => {
    if (!currentPrice || !editSL || !editTP) return { profit: 0, loss: 0 };
    const isSell = suggestion?.action === 'SELL';
    
    // Corrected P&L math for EUR/USD (Projections based on projected entryPrice)
    const rawProfitUSD = isSell ? (currentPrice - editTP) * editSize : (editTP - currentPrice) * editSize;
    const rawLossUSD = isSell ? (editSL - currentPrice) * editSize : (currentPrice - editSL) * editSize;
    
    return { 
      profit: rawProfitUSD / currentPrice, 
      loss: rawLossUSD / currentPrice 
    };
  };

  const { profit, loss } = calculatePotential();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-md flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-wrap gap-2">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          Orbit Command
        </h3>
        
        <div className="flex gap-2 items-center ml-auto">
          <select
            value={epic}
            onChange={(e) => {
              setEpic(e.target.value);
              setContext(null);
              setContextId(null);
              setSuggestion(null);
            }}
            className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white font-mono focus:outline-none text-[10px] appearance-none"
          >
            <option value="EURUSD">EUR/USD</option>
            <option value="GBPUSD">GBP/USD</option>
            <option value="USDJPY">USD/JPY</option>
            <option value="AUDUSD">AUD/USD</option>
          </select>

          <button
            onClick={prepareContext}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 transition-all text-xs font-bold disabled:opacity-50"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            Prepare Context
          </button>
          <button
            onClick={consultGemini}
            disabled={isLoading || !context}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
          >
            <Brain className="w-3 h-3" />
            Consult Gemini
          </button>
        </div>
      </div>

      <div className="p-6 flex-grow overflow-y-auto space-y-6">

        {context && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Raw Data Context
              </span>
              <div className="flex gap-3">
                <button onClick={copyToClipboard} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                  {isCopied ? <><Check className="w-3 h-3 text-emerald-400" /> <span className="text-emerald-400 font-bold">Copied!</span></> : <><Copy className="w-3 h-3" /> <span className="font-bold">Copy</span></>}
                </button>
                <button onClick={() => setShowContext(!showContext)} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-bold uppercase">
                  {showContext ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {showContext && (
              <div className="p-4 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-emerald-500/80 overflow-x-auto max-h-40 scrollbar-hide">
                <pre>{JSON.stringify(context, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {suggestion && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-2xl font-black uppercase tracking-tight mb-2 shadow-2xl",
                suggestion.action === 'BUY' ? "bg-emerald-500/20 text-emerald-400" : 
                suggestion.action === 'SELL' ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-slate-400"
              )}>
                {suggestion.action === 'BUY' ? <TrendingUp className="w-8 h-8" /> : 
                 suggestion.action === 'SELL' ? <TrendingDown className="w-8 h-8" /> : <Minus className="w-8 h-8" />}
                {suggestion.action} {suggestion.pair}
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                Confidence: <span className="text-white">{suggestion.confidence_score}%</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-black px-1">Units</span>
                <input 
                  type="number" value={editSize} onChange={(e) => setEditSize(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-500 uppercase font-black px-1">TP</span>
                <input 
                  type="number" step="0.0001" value={editTP} onChange={(e) => setEditTP(Number(e.target.value))}
                  className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-rose-500 uppercase font-black px-1">SL</span>
                <input 
                  type="number" step="0.0001" value={editSL} onChange={(e) => setEditSL(Number(e.target.value))}
                  className="w-full bg-rose-500/5 border border-rose-500/20 rounded-lg p-2 text-sm font-mono text-rose-400 focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                <span className="block text-[9px] text-emerald-500/70 uppercase font-black mb-1">Max Profit Potential</span>
                <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(profit)}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-center">
                <span className="block text-[9px] text-rose-500/70 uppercase font-black mb-1">Max Loss Potential</span>
                <span className="text-sm font-mono font-bold text-rose-400">{formatCurrency(loss)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <span className="block text-[10px] text-blue-400 uppercase font-black mb-1">Strategist Reasoning</span>
              <p className="text-xs text-slate-300 leading-relaxed italic">"{suggestion.reasoning}"</p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20 animate-in fade-in zoom-in-95">
                ❌ {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => onExecute({ 
                  ...suggestion, 
                  amount: editSize, 
                  stop_loss: editSL, 
                  take_profit: editTP,
                  reasoning: suggestion.reasoning, 
                  context_id: suggestion.context_log_id || suggestion.context_id || contextId || undefined
                })}
                className="flex-1 group flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                <Rocket className="w-5 h-5" />
                Execute Trade
              </button>
              <button
                onClick={() => { onReject(suggestion); setSuggestion(null); }}
                className="px-6 py-4 rounded-xl bg-white/5 text-slate-400 font-bold text-sm hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
