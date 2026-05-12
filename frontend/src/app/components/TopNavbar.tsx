import React from 'react';
import { useAccountStore } from '../lib/store';
import { 
  TrendingUp, 
  Wallet, 
  Activity, 
  ShieldCheck, 
  Menu,
  ChevronDown,
  CircleDollarSign
} from 'lucide-react';
import { cn } from './StatCard';
import { formatCurrency } from '@/lib/utils';

interface TopNavbarProps {
  onMenuClick?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onMenuClick }) => {
  const { balance, available_margin, used_margin, unrealized_pnl } = useAccountStore();

  return (
    <nav className="h-16 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-white/5 md:hidden text-slate-400"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tighter hidden sm:block">LUNARIS ORBIT</span>
        </div>
      </div>

      <div className="flex items-center gap-8 lg:gap-12 h-full py-3">
        <div className="flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Account Value</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-mono font-bold text-white">{formatCurrency(balance)}</span>
          </div>
        </div>

        <div className="flex flex-col justify-center border-l border-white/5 pl-8 lg:pl-12">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Available to Trade</span>
          <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(available_margin)}</span>
        </div>

        <div className="flex flex-col justify-center border-l border-white/5 pl-8 lg:pl-12">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Performance (P&L)</span>
          <div className={cn(
            "text-sm font-mono font-bold flex items-center gap-1",
            unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(unrealized_pnl)}
          </div>
        </div>

        <div className="flex flex-col justify-center border-l border-white/5 pl-8 lg:pl-12 hidden md:flex">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Margin Used</span>
          <span className="text-sm font-mono font-bold text-white">{formatCurrency(used_margin)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Live Bridge</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
          <span className="text-[10px] font-black text-blue-400 uppercase">RM</span>
        </div>
      </div>
    </nav>
  );
};
