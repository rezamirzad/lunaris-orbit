"use client";

import React, { useEffect, useState } from 'react';
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
  TrendingDown
} from 'lucide-react';
import { StatCard, cn } from './components/StatCard';
import { PriceDisplay } from './components/PriceDisplay';
import { TradePanel } from './components/TradePanel';
import { AccountDetails } from './components/AccountDetails';

export default function Dashboard() {
  const [account, setAccount] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  const fetchAccount = () => {
    fetch('http://localhost:4000/api/account')
      .then(res => res.json())
      .then(data => setAccount(data))
      .catch(err => console.error('Failed to fetch account:', err));
  };

  useEffect(() => {
    fetchAccount();
    // Refresh account data every 30 seconds
    const interval = setInterval(fetchAccount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTradeSuccess = (trade: any) => {
    setRecentTrades(prev => [trade, ...prev].slice(0, 5));
    fetchAccount(); // Refresh balance after trade
  };

  const balance = account?.accountInfo?.balance || 0;
  const pnl = account?.accountInfo?.profitLoss || 0;
  const available = account?.accountInfo?.available || 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 border-r border-white/5 bg-[#09090b] hidden md:block`}>
        <div className="flex flex-col h-full px-4 py-6">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">LUNARIS</span>
          </div>

          <nav className="flex-1 space-y-1">
            {[
              { icon: BarChart3, label: 'Dashboard', active: true },
              { icon: ArrowRightLeft, label: 'Trade History' },
              { icon: PieChart, label: 'Portfolio' },
              { icon: Settings, label: 'Settings' },
            ].map((item) => (
              <button
                key={item.label}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.active ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
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

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-medium text-slate-400">Market Overview / EURUSD</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold">Live Connection</span>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Total Balance" 
              value={`€${balance.toLocaleString()}`} 
              icon={<Wallet className="w-4 h-4" />}
            />
            <StatCard 
              title="Unrealized P&L" 
              value={`€${pnl.toLocaleString()}`} 
              trend={{ value: `${pnl >= 0 ? '+' : ''}${pnl}`, isUp: pnl >= 0 }}
            />
            <StatCard 
              title="Available Margin" 
              value={`€${available.toLocaleString()}`} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area (Placeholder) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="h-[400px] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                <div className="text-slate-500 flex flex-col items-center gap-2">
                  <BarChart3 className="w-8 h-8 opacity-20" />
                  <span className="text-sm">Advanced Chart View Coming Soon</span>
                </div>
              </div>
              
              <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Recent Activity</h3>
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View All</button>
                </div>
                <div className="p-0">
                  {recentTrades.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-8">No recent trades to display.</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {recentTrades.map((trade) => (
                        <div key={trade.dealId} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              trade.direction === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {trade.direction === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">EUR/USD {trade.direction}</div>
                              <div className="text-xs text-slate-500">ID: {trade.dealId}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">{trade.size} Lots</div>
                            <div className="text-[10px] text-slate-500 uppercase">{trade.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trading Sidebar */}
            <div className="space-y-6">
              <PriceDisplay />
              <TradePanel onTradeSuccess={handleTradeSuccess} account={account} />
              <AccountDetails account={account} />
              
              <div className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-blue-600/10 to-indigo-600/10">
                <h4 className="text-sm font-semibold text-white mb-2">Strategy Signal</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  The current market volatility for EURUSD is moderate. RSI indicates a potential oversold condition.
                </p>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                    Moderate Buy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
