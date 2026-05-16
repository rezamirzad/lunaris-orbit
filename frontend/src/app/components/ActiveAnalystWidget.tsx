"use client";

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  X, 
  CheckCircle2, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Target,
  ArrowRight
} from 'lucide-react';
import { cn } from './StatCard';
import { useTradeStore, useAccountStore } from '../lib/store';

const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(val);

export const ActiveAnalystWidget: React.FC = () => {
  const { selectedTradeForAnalysis, setSelectedTradeForAnalysis } = useTradeStore();
  const { fetchAccountLive } = useAccountStore();
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  
  const [editSL, setEditSL] = useState<number | null>(null);
  const [editTP, setEditTP] = useState<number | null>(null);

  useEffect(() => {
    if (selectedTradeForAnalysis) {
      performAnalysis(selectedTradeForAnalysis);
    } else {
      setAnalysisResult(null);
    }
  }, [selectedTradeForAnalysis]);

  const performAnalysis = async (pos: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/analyze-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trade_id: pos.dealId, 
          symbol: pos.epic,
          entry: pos.entryPrice,
          sl: pos.sl,
          tp: pos.tp,
          current_price: pos.livePrice,
          trade_ledger_id: pos.id // If available
        })
      });
      const data = await response.json();
      setAnalysisResult({ 
        id: data.analysis.id,
        dealId: pos.dealId, 
        epic: pos.epic,
        current_sl: pos.sl, 
        current_tp: pos.tp,
        ...data.raw_ai 
      });
      setEditSL(data.raw_ai.new_sl || pos.sl);
      setEditTP(data.raw_ai.new_tp || pos.tp);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyModification = async () => {
    if (!analysisResult) return;
    setIsApplying(true);
    try {
      if (analysisResult.id) {
        await fetch("http://localhost:4000/api/ai/confirm-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: analysisResult.id, is_confirmed: true })
        }).catch(err => console.error("Failed to confirm suggestion:", err));
      }

      const response = await fetch('http://localhost:4000/api/modify-trade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: analysisResult.dealId,
          new_sl: editSL,
          new_tp: editTP
        })
      });
      if (response.ok) {
        handleDismiss();
        fetchAccountLive();
      } else {
        alert('Failed to apply modification');
      }
    } catch (err) {
      console.error('Apply Error:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDismiss = async () => {
    if (analysisResult?.id) {
      try {
        await fetch("http://localhost:4000/api/ai/confirm-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: analysisResult.id, is_confirmed: false })
        });
      } catch (err) {
        console.error("Failed to reject suggestion:", err);
      }
    }
    setAnalysisResult(null);
    setSelectedTradeForAnalysis(null);
  };

  if (!selectedTradeForAnalysis) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <Brain className="w-8 h-8 text-slate-600 mx-auto mb-3 opacity-20" />
        <p className="text-slate-500 text-xs font-medium italic">Select an active trade to analyze.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-md flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-400" />
          Active AI Analyst
        </h3>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Consulting Strategist...</p>
          </div>
        ) : analysisResult ? (
          <>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Instrument</div>
                <div className="text-sm font-bold text-white">{analysisResult.epic}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deal ID</div>
                <div className="text-[10px] font-mono text-slate-300">{analysisResult.dealId}</div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3" /> AI Thesis
              </span>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-xs text-slate-300 italic leading-relaxed">"{analysisResult.reasoning}"</p>
              </div>
            </div>

            {analysisResult.recommendation === 'MODIFY_SL_TP' && (
              <div className="space-y-4">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest flex items-center gap-2">
                  Modification Form
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <ShieldCheck className="w-3 h-3 text-rose-500" />
                      <span className="text-[9px] text-slate-500 font-black uppercase">Stop Loss</span>
                    </div>
                    <input 
                      type="number" step="0.0001" value={editSL || ''} onChange={(e) => setEditSL(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <Target className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] text-slate-500 font-black uppercase">Take Profit</span>
                    </div>
                    <input 
                      type="number" step="0.0001" value={editTP || ''} onChange={(e) => setEditTP(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={applyModification}
                disabled={isApplying}
                className="w-full group flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Apply Changes
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-4 rounded-xl bg-white/5 text-slate-400 font-bold text-xs hover:bg-white/10 transition-all"
              >
                Dismiss
              </button>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs italic">
            Waiting for AI analysis...
          </div>
        )}
      </div>
    </div>
  );
};