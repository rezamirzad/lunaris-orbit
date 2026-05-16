import React, { useEffect, useState } from 'react';
import { X, Activity, Layers, Terminal, Crosshair, Brain, ShieldCheck } from 'lucide-react';
import { cn } from './StatCard';

interface AuditModalProps {
  dealId: string;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ dealId, onClose }) => {
  const [auditData, setAuditData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/portfolio/audit/${dealId}`);
        if (!response.ok) throw new Error('Audit not found');
        const data = await response.json();
        setAuditData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAudit();
  }, [dealId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!auditData) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
        <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-6 rounded-xl font-bold">
          Failed to load audit trail for {dealId}
          <button onClick={onClose} className="block mt-4 text-xs underline">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <div>
              <h4 className="font-black text-white uppercase tracking-tight text-lg">Full Audit Trail</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Transaction: {dealId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          
          {/* 1. Market Context Phase */}
          <div className="space-y-4">
            <h5 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">
              <Layers className="w-4 h-4" /> 1. Market Environment (Snapshot)
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/50 border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Time of Capture</span>
                <span className="text-xs text-white font-mono">{new Date(auditData.market_snapshots?.timestamp).toLocaleString()}</span>
              </div>
              <div className="p-4 rounded-xl bg-black/50 border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Pricing (OHLCV)</span>
                <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto">
                  {JSON.stringify(auditData.market_snapshots?.ohlcv, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* 2. AI Reasoning Phase (if any) */}
          {auditData.trade_suggestions && (
            <div className="space-y-4">
              <h5 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">
                <Brain className="w-4 h-4" /> 2. Quantitative Strategy & AI
              </h5>
              <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">OrbitAI Suggestion</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase bg-white/5 px-2 py-1 rounded-md">
                    Decision: {auditData.trade_suggestions.decision_status}
                  </span>
                </div>
                <p className="text-sm text-slate-300 italic">"{auditData.trade_suggestions.reasoning}"</p>
              </div>
            </div>
          )}

          {/* 3. Execution Phase */}
          <div className="space-y-4">
            <h5 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">
              <Terminal className="w-4 h-4" /> 3. Broker Execution (Ledger)
            </h5>
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 overflow-x-auto">
              <pre className="text-[10px] font-mono text-emerald-400">
                {JSON.stringify(auditData.broker_response, null, 2)}
              </pre>
            </div>
          </div>

          {/* 4. Post-Execution Activities */}
          {auditData.trade_activities && auditData.trade_activities.length > 0 && (
            <div className="space-y-4">
              <h5 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">
                <Crosshair className="w-4 h-4" /> 4. Lifecycle Activities
              </h5>
              <div className="space-y-3">
                {auditData.trade_activities.map((act: any) => (
                  <div key={act.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-black text-white">{act.activity_type}</span>
                      <span className="block text-[10px] text-slate-500 font-mono mt-1">{new Date(act.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      {act.pnl && <span className={cn("text-xs font-bold", act.pnl > 0 ? "text-emerald-400" : "text-rose-400")}>{act.pnl} EUR</span>}
                      {act.stop_loss && <span className="block text-[10px] text-slate-400">SL: {act.stop_loss}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
