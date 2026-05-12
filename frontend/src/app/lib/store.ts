import { create } from 'zustand';

interface AccountState {
  balance: number;
  available_margin: number;
  used_margin: number;
  unrealized_pnl: number;
  timestamp: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setAccountData: (data: Partial<AccountState>) => void;
  fetchAccountLive: () => Promise<void>;
}

export const useAccountStore = create<AccountState>((set) => ({
  balance: 0,
  available_margin: 0,
  used_margin: 0,
  unrealized_pnl: 0,
  timestamp: null,
  isLoading: false,
  error: null,

  setAccountData: (data) => set((state) => ({ ...state, ...data })),

  fetchAccountLive: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('http://localhost:4000/api/account/live');
      if (!response.ok) throw new Error('Failed to fetch account data');
      const data = await response.json();
      set({
        balance: data.balance,
        available_margin: data.available_margin,
        used_margin: data.used_margin,
        unrealized_pnl: data.unrealized_pnl,
        timestamp: data.timestamp,
        error: null
      });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
