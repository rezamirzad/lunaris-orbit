import React from 'react';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Target
} from 'lucide-react';
import { cn } from './StatCard';

interface AISuggestion {
  id: string;
  pair: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;
  stop_loss: number;
  take_profit: number;
  confidence_score: number;
  reasoning: string;
}

interface AISuggestionCardProps {
  suggestion: AISuggestion | null;
  isLoading: boolean;
  onGenerate: () => void;
  onExecute: () => void;
}

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({ 
  suggestion, 
  isLoading, 
  onGenerate, 
  onExecute 
}) => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-md flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          AI Consulting
        </h3>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          Generate Suggestion
        </button>
      </div>

      <div className="p-6 flex-grow flex flex-col justify-center">
        {!suggestion && !isLoading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No active suggestion. Click the button above to consult the AI Strategist.</p>
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
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xl font-black uppercase tracking-tight mb-2",
                suggestion!.action === 'BUY' ? "bg-emerald-500/20 text-emerald-400" : 
                suggestion!.action === 'SELL' ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-slate-400"
              )}>
                {suggestion!.action === 'BUY' ? <TrendingUp className="w-6 h-6" /> : 
                 suggestion!.action === 'SELL' ? <TrendingDown className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                {suggestion!.action} {suggestion!.pair}
              </div>
              
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Confidence
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px]",
                    suggestion!.confidence_score > 70 ? "bg-emerald-500/10 text-emerald-500" : 
                    suggestion!.confidence_score > 40 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {suggestion!.confidence_score}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Entry</span>
                <span className="text-sm font-mono text-white">Market</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500/70 uppercase font-bold">TP</span>
                </div>
                <span className="text-sm font-mono text-emerald-400">{suggestion!.take_profit.toFixed(5)}</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ShieldCheck className="w-3 h-3 text-rose-500" />
                  <span className="text-[10px] text-rose-500/70 uppercase font-bold">SL</span>
                </div>
                <span className="text-sm font-mono text-rose-400">{suggestion!.stop_loss.toFixed(5)}</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <span className="block text-[10px] text-blue-400 uppercase font-black mb-1">Key Driver</span>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{suggestion!.reasoning}"
              </p>
            </div>

            <button
              onClick={onExecute}
              className="w-full group flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              Execute Institutional Trade
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
