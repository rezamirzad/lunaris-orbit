"use client";

import React, { useEffect, useState } from 'react';
import { 
  History, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ShieldCheck, 
  Target, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  X,
  FileJson,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Zap,
  Layers,
  Terminal,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from './StatCard';

interface HistoryItem {
  id: string;
  broker_transaction_id: string;
  direction: 'BUY' | 'SELL';
  size: number;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  status: string;
  created_at: string;
  initial_max_profit_potential: number | null;
  initial_max_loss_potential: number | null;
  broker_response?: any;
  market_snapshots?: any;
  ai_logs?: {
    reasoning: any;
    confidence_score: number;
    created_at: string;
  }[];
  trade_activities?: {
    id: string;
    activity_type: 'ENTRY' | 'MODIFICATION' | 'CLOSURE';
    price: number;
    stop_loss: number | null;
    take_profit: number | null;
    pnl: number | null;
    created_at: string;
    broker_response?: any;
  }[];
  initiating_suggestion?: any;
  related_suggestions?: any[];
}

interface SuggestionItem {
  id: string;
  pair: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;
  stop_loss: number | null;
  take_profit: number | null;
  confidence_score: number;
  user_confirmed: boolean;
  decision_status: string;
  reasoning: string;
  suggestion_type: string;
  raw_ai_response?: any;
  created_at: string;
  entry_price?: number;
}

const formatCurrency = (val: number) => {
  const formatted = Math.abs(val).toFixed(2) + '€';
  return val > 0 ? `+${formatted}` : val < 0 ? `-${formatted}` : formatted;
};

const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(val);

export const TradeHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'SUGGESTIONS'>('LEDGER');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState<any | null>(null);
  const [selectedRawJson, setSelectedRawJson] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      if (activeTab === 'LEDGER') {
        const response = await fetch('http://localhost:4000/api/portfolio/history');
        const data = await response.json();
        setHistory(data);
      } else {
        const response = await fetch('http://localhost:4000/api/portfolio/suggestions');
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const getFinalPnL = (item: HistoryItem) => {
    const closure = item.trade_activities?.find(a => a.activity_type === 'CLOSURE');
    return closure?.pnl || 0;
  };

  if (isLoading && history.length === 0 && suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <div className="flex justify-center mb-4">
          <History className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <p className="text-slate-500 text-sm italic font-medium">Aggregating Records...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-md">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-6">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            Trade History
          </h3>
          <div className="flex bg-black/40 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('LEDGER')}
              className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-widest", activeTab === 'LEDGER' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              Ledger
            </button>
            <button 
              onClick={() => setActiveTab('SUGGESTIONS')}
              className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-widest", activeTab === 'SUGGESTIONS' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              AI Suggestions
            </button>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          {activeTab === 'LEDGER' ? history.length : suggestions.length} Records
        </span>
      </div>

      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5 bg-white/5">
              <th className="px-6 py-3 font-semibold">Instrument</th>
              <th className="px-6 py-3 font-semibold">Activity</th>
              {activeTab === 'LEDGER' && <th className="px-6 py-3 font-semibold text-right">Performance</th>}
              <th className="px-6 py-3 font-semibold text-right">Status</th>
              <th className="px-6 py-3 font-semibold text-right">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {activeTab === 'LEDGER' && history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 italic">No historical ledger entries found.</td>
              </tr>
            )}
            {activeTab === 'SUGGESTIONS' && suggestions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 italic">No AI suggestions found.</td>
              </tr>
            )}
            
            {activeTab === 'LEDGER' && history.map((item) => {
                const isLive = item.status !== 'CLOSED';
                const finalPnL = getFinalPnL(item);
                
                return (
                  <React.Fragment key={item.id}>
                    <tr className="group hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              EUR/USD
                            </div>
                            {isLive && (
                              <div className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border",
                            isLive ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : "text-slate-500 border-white/10 bg-white/5"
                          )}>
                            {isLive ? 'Live' : 'Finished'}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase mt-1">ID: {item.broker_transaction_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            item.direction === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {item.direction === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-black text-white">{item.size.toLocaleString('en-US')} UNITS</div>
                            <div className="text-[10px] text-slate-500 font-medium">@{formatPrice(item.entry_price)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          {!isLive ? (
                            <div className={cn("text-sm font-black font-mono tracking-tighter", finalPnL >= 0 ? "text-emerald-400" : "text-rose-400")}>
                              {formatCurrency(finalPnL)}
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> Ongoing
                            </div>
                          )}
                          <div className="flex gap-2 mt-1 opacity-60">
                            <span className="text-[8px] font-bold text-rose-500">{item.initial_max_loss_potential ? formatCurrency(item.initial_max_loss_potential) : 'N/A'}</span>
                            <span className="text-[8px] font-bold text-emerald-500">{item.initial_max_profit_potential ? formatCurrency(item.initial_max_profit_potential) : 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                          item.status === 'EXECUTED' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : 
                          item.status === 'CLOSED' ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" : 
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {item.status}
                        </span>
                        <div className="text-[8px] text-slate-500 mt-1 font-mono">{new Date(item.created_at).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {item.ai_logs && item.ai_logs.length > 0 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedReasoning(item.ai_logs![0].reasoning); }}
                              className="p-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                              title="View AI Reasoning"
                            >
                              <Brain className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="p-2 rounded-lg bg-white/5 text-slate-500 group-hover:text-white transition-colors">
                            {expandedId === item.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr className="bg-white/[0.01]">
                        <td colSpan={5} className="px-8 py-10">
                          <div className="max-w-4xl mx-auto">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                              <History className="w-3 h-3" /> Institutional Audit Trail
                            </h4>
                            
                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500/50 before:via-white/5 before:to-transparent">
                              
                              {/* 1. Initial Context & Suggestion */}
                              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-500/30 bg-[#09090b] text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 bg-white/5">
                                  <div className="flex items-center justify-between mb-2">
                                    <time className="text-[9px] font-mono text-slate-500">{new Date(item.created_at).toLocaleString()}</time>
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Initial Context</span>
                                  </div>
                                  <div className="text-xs text-slate-300">
                                    Market snapshot captured. Entry rate established at <span className="font-mono text-white">{formatPrice(item.entry_price)}</span>.
                                  </div>
                                  {item.initiating_suggestion && (
                                    <div className="mt-3 p-3 rounded-xl bg-blue-600/5 border border-blue-500/20">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Brain className="w-3 h-3 text-blue-400" />
                                        <span className="text-[9px] font-black text-blue-400 uppercase">AI Strategist</span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 italic">"{item.initiating_suggestion.reasoning}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 2. Execution */}
                              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-emerald-500/30 bg-[#09090b] text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                  <Terminal className="w-4 h-4" />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 bg-white/5">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Trade Executed</span>
                                    <time className="text-[9px] font-mono text-slate-500">{new Date(item.created_at).toLocaleString()}</time>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-xs text-slate-300">
                                      Position opened: <span className="text-white font-bold">{item.direction} {item.size.toLocaleString()} UNITS</span>
                                    </div>
                                    <div className="text-xs text-slate-300">
                                      SL: <span className="text-rose-400 font-mono">{item.stop_loss ? formatPrice(item.stop_loss) : 'NONE'}</span>
                                    </div>
                                    <div className="text-xs text-slate-300">
                                      TP: <span className="text-emerald-400 font-mono">{item.take_profit ? formatPrice(item.take_profit) : 'NONE'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Lifecycle Activities (Modifications, AI Analysis) */}
                              {item.trade_activities?.filter(a => a.activity_type === 'MODIFICATION').map((activity, idx) => {
                                // Find if there was an AI suggestion linked to this modification
                                const relatedAI = item.related_suggestions?.find(s => 
                                  Math.abs(new Date(s.created_at).getTime() - new Date(activity.created_at).getTime()) < 5000
                                );

                                return (
                                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-amber-500/30 bg-[#09090b] text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                      <Zap className="w-4 h-4" />
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 bg-white/5">
                                      <div className="flex items-center justify-between mb-2">
                                        <time className="text-[9px] font-mono text-slate-500">{new Date(activity.created_at).toLocaleString()}</time>
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Modification</span>
                                      </div>
                                      <div className="text-xs text-slate-300 mb-2">
                                        Manual adjustment applied to risk boundaries.
                                      </div>
                                      <div className="flex items-center gap-4 text-[10px] font-mono p-2 rounded-lg bg-black/30 border border-white/5">
                                        <span className="text-rose-400/70 italic">NEW SL: {activity.stop_loss ? formatPrice(activity.stop_loss) : 'N/A'}</span>
                                        <span className="text-emerald-400/70 italic">NEW TP: {activity.take_profit ? formatPrice(activity.take_profit) : 'N/A'}</span>
                                      </div>
                                      {relatedAI && (
                                        <div className="mt-3 p-3 rounded-xl bg-blue-600/5 border border-blue-500/20">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Brain className="w-3 h-3 text-blue-400" />
                                            <span className="text-[9px] font-black text-blue-400 uppercase">AI Review Recommendation</span>
                                          </div>
                                          <p className="text-[11px] text-slate-400 italic">"{relatedAI.reasoning}"</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* 4. Closure */}
                              {!isLive && item.trade_activities?.find(a => a.activity_type === 'CLOSURE') && (() => {
                                const closure = item.trade_activities.find(a => a.activity_type === 'CLOSURE')!;
                                return (
                                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className={cn(
                                      "flex items-center justify-center w-10 h-10 rounded-full border bg-[#09090b] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2",
                                      (closure.pnl || 0) >= 0 ? "border-emerald-500/30 text-emerald-400" : "border-rose-500/30 text-rose-400"
                                    )}>
                                      {(closure.pnl || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 bg-white/5">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest", (closure.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>Trade Finalized</span>
                                        <time className="text-[9px] font-mono text-slate-500">{new Date(closure.created_at).toLocaleString()}</time>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <span className="block text-[9px] text-slate-500 uppercase font-black mb-1">Exit Price</span>
                                          <span className="text-xs font-mono text-white">{formatPrice(closure.price)}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="block text-[9px] text-slate-500 uppercase font-black mb-1">Final Result</span>
                                          <span className={cn("text-xs font-black font-mono", (closure.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                            {formatCurrency(closure.pnl || 0)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>

                            <div className="mt-10 pt-6 border-t border-white/5 flex justify-end">
                              <button 
                                onClick={() => setSelectedRawJson(item.broker_response)}
                                className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-blue-400 font-bold transition-all uppercase tracking-widest"
                              >
                                <FileJson className="w-3 h-3" /> View Institutional Payload
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
            })}

            {activeTab === 'SUGGESTIONS' && suggestions.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="group hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-white">{item.pair}</div>
                      <div className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">{item.suggestion_type.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          item.action === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : 
                          item.action === 'SELL' ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400"
                        )}>
                          {item.action === 'BUY' ? <TrendingUp className="w-4 h-4" /> : 
                           item.action === 'SELL' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">{item.amount > 0 ? item.amount.toLocaleString('en-US') + ' UNITS' : 'NO CHANGE'}</div>
                          <div className="text-[10px] text-slate-500 font-medium">Conf: {item.confidence_score}%</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.decision_status === 'ACCEPTED' && <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Accepted</span>}
                        {item.decision_status === 'REJECTED' && <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Rejected</span>}
                        {item.decision_status === 'PENDING' && <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pending</span>}
                      </div>
                      <div className="text-[8px] text-slate-500 mt-1 font-mono">{new Date(item.created_at).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="p-2 rounded-lg bg-white/5 text-slate-500 group-hover:text-white transition-colors">
                          {expandedId === item.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr className="bg-white/[0.02]">
                      <td colSpan={4} className="px-8 py-6">
                        <div className="grid grid-cols-3 gap-6 mb-6">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Suggested Entry</span>
                            <div className="text-xs font-mono text-white flex items-center gap-1.5">
                              <Activity className="w-3 h-3" /> {item.entry_price ? formatPrice(item.entry_price) : 'MARKET'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Suggested Stop Loss</span>
                            <div className="text-xs font-mono text-rose-400 flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3" /> {item.stop_loss ? formatPrice(item.stop_loss) : 'NONE'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Suggested Take Profit</span>
                            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                              <Target className="w-3 h-3" /> {item.take_profit ? formatPrice(item.take_profit) : 'NONE'}
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest">AI Reasoning</span>
                          </div>
                          <p className="text-xs text-slate-300 italic leading-relaxed">"{item.reasoning}"</p>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button 
                            onClick={() => setSelectedRawJson(item.raw_ai_response || item)}
                            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Raw JSON
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reasoning Modal */}
      {selectedReasoning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-blue-400" />
                <div>
                  <h4 className="font-black text-white uppercase tracking-tight text-lg">AI Decision Audit</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Immutable Reasoning Retrieval</p>
                </div>
              </div>
              <button onClick={() => setSelectedReasoning(null)} className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8">
              <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Strategist Logic</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase">Verified</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-sm italic font-medium">"{selectedReasoning.reasoning || selectedReasoning.reason}"</p>
              </div>
              <button onClick={() => setSelectedReasoning(null)} className="mt-8 w-full py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-sm hover:bg-white/10 transition-all uppercase tracking-widest">Close Audit</button>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON Modal */}
      {selectedRawJson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <FileJson className="w-6 h-6 text-blue-400" />
                <div>
                  <h4 className="font-black text-white uppercase tracking-tight text-lg">Broker Raw Payload</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Capital.com Transaction Log</p>
                </div>
              </div>
              <button onClick={() => setSelectedRawJson(null)} className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-emerald-500/80 break-all whitespace-pre-wrap min-h-[100px]">
                {selectedRawJson ? JSON.stringify(selectedRawJson, null, 2) : "No raw payload data available for this record."}
              </div>
              <button onClick={() => setSelectedRawJson(null)} className="mt-8 w-full py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-sm hover:bg-white/10 transition-all uppercase tracking-widest">Close Payload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
