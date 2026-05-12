"use client";

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  Search, 
  Target, 
  ShieldAlert, 
  Brain,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { cn } from './StatCard';
import { useAccountStore } from '../lib/store';

const formatCurrency = (val: number) => {
  const formatted = Math.abs(val).toFixed(2) + '€';
  return val > 0 ? `+${formatted}` : val < 0 ? `-${formatted}` : formatted;
};

const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(val);

interface Position {
  dealId: string;
  epic: string;
  direction: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  livePrice: number;
  sl: number | null;
  tp: number | null;
  initial_sl?: number | null;
  initial_tp?: number | null;
  pnl: number;
}

export const PortfolioView: React.FC = () => {
  const { fetchAccountLive } = useAccountStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);

  const fetchPositions = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/portfolio/active');
      const data = await response.json();
      setPositions(data);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000); // Poll every 5s (Bob's Requirement)
    return () => clearInterval(interval);
  }, []);

  const handleClose = async (dealId: string, size: number) => {
    setClosingId(dealId);
    try {
      const response = await fetch(`http://localhost:4000/api/close-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (response.ok) {
        setPositions((prev) => prev.filter((p) => p.dealId !== dealId));
        setAnalysisResult(null);
        fetchAccountLive();
      } else {
        const error = await response.json();
        alert(`Failed to close trade: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error closing trade:', error);
    } finally {
      setClosingId(null);
    }
  };

  const analyzeTrade = async (pos: Position) => {
    setAnalyzingId(pos.dealId);
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
          current_price: pos.livePrice
        })
      });
      const data = await response.json();
      setAnalysisResult({ 
        dealId: pos.dealId, 
        current_sl: pos.sl, 
        current_tp: pos.tp,
        size: pos.size,
        direction: pos.direction,
        currentPrice: pos.livePrice,
        ...data.raw_ai 
      });
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const applyModification = async () => {
    if (!analysisResult) return;
    setIsApplying(true);
    try {
      const response = await fetch('http://localhost:4000/api/modify-trade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: analysisResult.dealId,
          new_sl: analysisResult.new_sl,
          new_tp: analysisResult.new_tp
        })
      });
      if (response.ok) {
        setAnalysisResult(null);
        fetchPositions(); 
      } else {
        alert('Failed to apply modification');
      }
    } catch (err) {
      console.error('Apply Error:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const calculatePotential = (entryPrice: number, sl: number | null, tp: number | null, direction: string, size: number) => {
    if (sl === null || tp === null) return { profit: 0, loss: 0 };
    const isSell = direction === 'SELL';
    
    // Projections strictly based on entryPrice to ensure static figures
    const rawProfitUSD = isSell ? (entryPrice - tp) * size : (tp - entryPrice) * size;
    const rawLossUSD = isSell ? (sl - entryPrice) * size : (entryPrice - sl) * size;
    
    return { 
      profit: rawProfitUSD / entryPrice, 
      loss: rawLossUSD / entryPrice 
    };
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-md">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Active Portfolio
        </h3>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{positions.length} Open Positions</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5 bg-white/5">
              <th className="px-6 py-3 font-semibold">Instrument</th>
              <th className="px-6 py-3 font-semibold">Direction</th>
              <th className="px-6 py-3 font-semibold">Size</th>
              <th className="px-6 py-3 font-semibold">Entry / Live</th>
              <th className="px-6 py-3 font-semibold">SL / TP</th>
              <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">Live P&L</th>
              <th className="px-6 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 italic">
                  No active institutional positions found on Capital.com.
                </td>
              </tr>
            ) : (
              positions.map((pos) => {
                const { profit, loss } = calculatePotential(pos.entryPrice, pos.sl, pos.tp, pos.direction, pos.size);
                return (
                  <tr key={pos.dealId} className="group hover:bg-white/5 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-white">{pos.epic}</div>
                      <div className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">ID: {pos.dealId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                        pos.direction === 'BUY' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}>
                        {pos.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-300">
                      {pos.size.toLocaleString('en-US')} <span className="text-[9px] text-slate-500 uppercase">Units</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-mono text-slate-500 leading-tight">IN: {formatPrice(pos.entryPrice)}</div>
                      <div className="text-xs font-mono font-black text-white leading-tight">LIVE: {formatPrice(pos.livePrice)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-500/80">
                        <ShieldAlert className="w-3 h-3" /> {pos.sl ? formatPrice(pos.sl) : 'NONE'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500/80">
                        <Target className="w-3 h-3" /> {pos.tp ? formatPrice(pos.tp) : 'NONE'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={cn(
                        "text-sm font-black font-mono tracking-tighter",
                        pos.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {formatCurrency(pos.pnl)}
                      </div>
                      {(pos.sl !== null && pos.tp !== null) && (
                        <div className="flex justify-end gap-2 mt-0.5 opacity-60">
                          <span className="text-[8px] font-bold text-rose-500">{formatCurrency(-Math.abs(loss))}</span>
                          <span className="text-[8px] font-bold text-emerald-500">{formatCurrency(Math.abs(profit))}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => analyzeTrade(pos)} disabled={analyzingId === pos.dealId}
                          className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                          title="Analyze Strategy"
                        >
                          {analyzingId === pos.dealId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleClose(pos.dealId, pos.size)} disabled={closingId === pos.dealId}
                          className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                          title="Close Position"
                        >
                          {closingId === pos.dealId ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* AI Analysis Modal */}
      {analysisResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-blue-400" />
                <div>
                  <h4 className="font-black text-white uppercase tracking-tight text-lg">Institutional Review</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Active Risk Assessment</p>
                </div>
              </div>
              <button onClick={() => setAnalysisResult(null)} className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="text-center">
                <div className={cn(
                  "inline-block px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4",
                  analysisResult.recommendation === 'STAY' ? "bg-emerald-500/20 text-emerald-400" :
                  analysisResult.recommendation === 'CLOSE_NOW' ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                )}>
                  Recommendation: {analysisResult.recommendation.replace('_', ' ')}
                </div>
                <p className="text-slate-300 leading-relaxed italic text-sm font-medium">"{analysisResult.reasoning}"</p>
              </div>

              {analysisResult.recommendation === 'MODIFY_SL_TP' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50">
                    <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Current Plan</span>
                    <div className="text-[11px] font-mono">SL: {analysisResult.current_sl ? formatPrice(analysisResult.current_sl) : 'N/A'}</div>
                    <div className="text-[11px] font-mono">TP: {analysisResult.current_tp ? formatPrice(analysisResult.current_tp) : 'N/A'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30">
                    <span className="block text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2">New Target</span>
                    <div className="text-[11px] font-mono font-bold text-white">SL: {analysisResult.new_sl ? formatPrice(analysisResult.new_sl) : 'N/A'}</div>
                    <div className="text-[11px] font-mono font-bold text-white">TP: {analysisResult.new_tp ? formatPrice(analysisResult.new_tp) : 'N/A'}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {analysisResult.recommendation === 'MODIFY_SL_TP' && (
                  <button onClick={applyModification} disabled={isApplying} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                    {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Apply Modification
                  </button>
                )}
                {analysisResult.recommendation === 'CLOSE_NOW' && (
                  <button onClick={() => handleClose(analysisResult.dealId, analysisResult.size)} disabled={closingId === analysisResult.dealId} className="w-full py-4 rounded-2xl bg-rose-600 text-white font-black text-sm hover:bg-rose-500 transition-all flex items-center justify-center gap-2">
                    {closingId === analysisResult.dealId ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />} Close Immediately
                  </button>
                )}
                <button onClick={() => setAnalysisResult(null)} className="w-full py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-sm hover:bg-white/10 transition-all">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
