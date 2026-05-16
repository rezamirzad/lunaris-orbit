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
  ArrowRight,
  Activity
} from 'lucide-react';
import { cn } from './StatCard';
import { useAccountStore, useTradeStore } from '../lib/store';
import { AuditModal } from './AuditModal';

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
  const { fetchAccountLive, activePositions, fetchPositions, setPositions } = useAccountStore();
  const { setSelectedTradeForAnalysis } = useTradeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [auditDealId, setAuditDealId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await fetchPositions();
      setIsLoading(false);
    };
    init();

    const interval = setInterval(fetchPositions, 5000); 
    
    const socket = io('http://localhost:4000');
    socket.on('pnl_update', (updates: { dealId: string, pnl: number, currentPrice: number }[]) => {
      const currentPositions = useAccountStore.getState().activePositions;
      const updatedPositions = currentPositions.map((pos) => {
        const update = updates.find((u) => u.dealId === pos.dealId);
        if (update) {
          return { ...pos, pnl: update.pnl, livePrice: update.currentPrice };
        }
        return pos;
      });
      setPositions(updatedPositions);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchPositions, setPositions]);

  const handleClose = async (dealId: string, size: number, suggestionId?: string) => {
    setClosingId(dealId);
    try {
      if (suggestionId) {
        await fetch("http://localhost:4000/api/ai/confirm-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: suggestionId, is_confirmed: true }),
        }).catch(err => console.error("Failed to confirm suggestion:", err));
      }

      const response = await fetch(`http://localhost:4000/api/close-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId }),
      });
      if (response.ok) {
        setPositions(activePositions.filter((p) => p.dealId !== dealId));
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
    setSelectedTradeForAnalysis(pos);
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
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activePositions.length} Open Positions</span>
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
            {activePositions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 italic">No active positions currently monitoring.</td>
              </tr>
            ) : activePositions.map((pos) => (
              <tr key={pos.dealId} className="group hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-white">{pos.epic}</div>
                  <div className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">ID: {pos.dealId}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    pos.direction === 'BUY' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}>
                    {pos.direction}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-[10px] text-slate-300">
                  {pos.size.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="text-[10px] font-mono text-slate-400">{formatPrice(pos.entryPrice)}</div>
                  <div className="text-xs font-mono text-white font-bold">{formatPrice(pos.livePrice)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[10px] font-mono text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 opacity-50" /> {pos.sl ? formatPrice(pos.sl) : 'NONE'}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <Target className="w-3 h-3 opacity-50" /> {pos.tp ? formatPrice(pos.tp) : 'NONE'}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={cn("text-xs font-black font-mono tracking-tight", pos.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {formatCurrency(pos.pnl)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => analyzeTrade(pos)}
                      className="p-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                      title="AI Risk Review"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setAuditDealId(pos.dealId)}
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                      title="Institutional Audit Trail"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleClose(pos.dealId, pos.size)}
                      disabled={closingId === pos.dealId}
                      className="p-2 rounded-lg bg-rose-600/10 text-rose-400 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                      title="Emergency Close"
                    >
                      {closingId === pos.dealId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Modal */}
      {auditDealId && (
        <AuditModal dealId={auditDealId} onClose={() => setAuditDealId(null)} />
      )}
    </div>
  );
};
