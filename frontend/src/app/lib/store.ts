import { create } from 'zustand';

interface AccountState {
  balance: number;
  available_margin: number;
  used_margin: number;
  unrealized_pnl: number;
  activePositions: any[];
  timestamp: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setAccountData: (data: Partial<AccountState>) => void;
  fetchAccountLive: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  setPositions: (positions: any[]) => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  balance: 0,
  available_margin: 0,
  used_margin: 0,
  unrealized_pnl: 0,
  activePositions: [],
  timestamp: null,
  isLoading: false,
  error: null,

  setAccountData: (data) => set((state) => ({ ...state, ...data })),

  setPositions: (positions) => {
    // Calculate total P&L from positions
    const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
    set({ activePositions: positions, unrealized_pnl: totalPnl });
  },

  fetchAccountLive: async () => {
    try {
      const response = await fetch('http://localhost:4000/api/account/live');
      if (!response.ok) throw new Error('Failed to fetch account data');
      const data = await response.json();
      set({
        balance: data.balance,
        available_margin: data.available_margin,
        used_margin: data.used_margin,
        // We still take the P&L from this endpoint as a fallback or for consistency
        unrealized_pnl: data.unrealized_pnl,
        timestamp: data.timestamp,
        error: null
      });
    } catch (err: any) {
      console.error("Account fetch error:", err);
    }
  },

  fetchPositions: async () => {
    try {
      const response = await fetch('http://localhost:4000/api/portfolio/active');
      if (!response.ok) throw new Error('Failed to fetch positions');
      const data = await response.json();
      
      const totalPnl = data.reduce((sum: number, p: any) => sum + (p.pnl || 0), 0);
      set({ 
        activePositions: data,
        unrealized_pnl: totalPnl,
        error: null 
      });
    } catch (err: any) {
      console.error("Positions fetch error:", err);
    }
  },
}));

interface TradeState {
  selectedTradeForAnalysis: any | null;
  setSelectedTradeForAnalysis: (trade: any | null) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedTradeForAnalysis: null,
  setSelectedTradeForAnalysis: (trade) => set({ selectedTradeForAnalysis: trade }),
}));
