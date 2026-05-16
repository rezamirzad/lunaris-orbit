import { supabase } from '../lib/supabaseClient.js';

export interface MarketSnapshot {
  symbol: string;
  ohlcv: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  indicators?: any;
  market_context?: {
    bid: number;
    ask: number;
    spread: number;
    volatility?: number;
    liquidity?: number;
  };
}

export interface TradeLog {
  market_snapshot_id: string;
  broker_transaction_id: string;
  direction: 'BUY' | 'SELL';
  size: number;
  entry_price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  initial_sl?: number | null;
  initial_tp?: number | null;
  initial_max_profit_potential?: number | null;
  initial_max_loss_potential?: number | null;
  status: string;
  broker_response: any;
}

export class PersistenceService {
  /**
   * Inserts a high-fidelity snapshot of the market state.
   */
  async insertMarketSnapshot(snapshot: MarketSnapshot) {
    const { data, error } = await supabase
      .from('market_snapshots')
      .insert({
        symbol: snapshot.symbol,
        ohlcv: snapshot.ohlcv,
        indicators: snapshot.indicators || {},
        market_context: snapshot.market_context || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting market snapshot:', error);
      throw error;
    }

    return data;
  }

  /**
   * Inserts a trade execution record linked to a market snapshot.
   * Includes immutable 'Initial' risk parameters for advanced auditing.
   */
  async insertTradeLog(trade: TradeLog & { trade_suggestion_id?: string; context_log_id?: string }) {
    const { data, error } = await supabase
      .from('trade_ledger')
      .insert({
        market_snapshot_id: trade.market_snapshot_id,
        broker_transaction_id: trade.broker_transaction_id,
        direction: trade.direction,
        size: trade.size,
        entry_price: trade.entry_price,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        initial_sl: trade.initial_sl || trade.stop_loss,
        initial_tp: trade.initial_tp || trade.take_profit,
        initial_max_profit_potential: trade.initial_max_profit_potential,
        initial_max_loss_potential: trade.initial_max_loss_potential,
        status: trade.status,
        broker_response: trade.broker_response,
        trade_suggestion_id: trade.trade_suggestion_id,
        context_log_id: trade.context_log_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting trade log:', error);
      throw error;
    }

    return data;
  }

  /**
   * Updates an existing trade record (e.g., when a position is modified or closed).
   */
  async updateTradeStatus(dealId: string, status: string, updates: any = {}) {
    const { data, error } = await supabase
      .from('trade_ledger')
      .update({ 
        status,
        ...updates
      })
      .eq('broker_transaction_id', dealId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Logs AI reasoning and embeddings for a specific trade.
   */
  async logAIReasoning(tradeLedgerId: string, marketSnapshotId: string, reasoning: any, confidence: number, embedding?: number[]) {
    const { data, error } = await supabase
      .from('ai_logs')
      .insert({
        trade_ledger_id: tradeLedgerId,
        market_snapshot_id: marketSnapshotId,
        reasoning,
        confidence_score: confidence,
        embedding: embedding
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging AI reasoning:', error);
      throw error;
    }

    return data;
  }

  /**
   * Inserts a trade suggestion from the AI consultation.
   */
  async insertTradeSuggestion(suggestion: { 
    pair: string, 
    action: 'BUY' | 'SELL' | 'HOLD', 
    amount: number, 
    entry_price?: number,
    stop_loss?: number, 
    take_profit?: number, 
    confidence_score: number,
    reasoning?: string,
    suggestion_type?: 'NEW_TRADE' | 'ACTIVE_ANALYSIS',
    raw_ai_response?: any,
    context_log_id?: string,
    trade_ledger_id?: string
  }) {
    const { data, error } = await supabase
      .from('trade_suggestions')
      .insert({
        pair: suggestion.pair,
        action: suggestion.action,
        amount: suggestion.amount,
        entry_price: suggestion.entry_price,
        stop_loss: suggestion.stop_loss,
        take_profit: suggestion.take_profit,
        confidence_score: suggestion.confidence_score,
        reasoning: suggestion.reasoning,
        suggestion_type: suggestion.suggestion_type || 'NEW_TRADE',
        raw_ai_response: suggestion.raw_ai_response,
        context_log_id: suggestion.context_log_id,
        trade_ledger_id: suggestion.trade_ledger_id,
        decision_status: 'PENDING',
        user_confirmed: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting trade suggestion:', error);
      console.error('Payload:', {
        pair: suggestion.pair,
        action: suggestion.action,
        amount: suggestion.amount,
        entry_price: suggestion.entry_price,
        stop_loss: suggestion.stop_loss,
        take_profit: suggestion.take_profit,
        confidence_score: suggestion.confidence_score,
        reasoning: suggestion.reasoning,
        suggestion_type: suggestion.suggestion_type || 'NEW_TRADE',
        context_log_id: suggestion.context_log_id,
        trade_ledger_id: suggestion.trade_ledger_id,
        raw_ai_response: suggestion.raw_ai_response
      });
      throw error;
    }

    console.log('Successfully logged AI suggestion to DB:', data.id);
    return data;
  }

  /**
   * Logs the compiled market context for AI auditability.
   */
  async logContext(symbol: string, context: any) {
    const { data, error } = await supabase
      .from('context_logs')
      .insert({
        symbol,
        context
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging context:', error);
      throw error;
    }

    return data;
  }

  /**
   * Fetches internal ledger data for a set of deal IDs to reconcile with live broker data.
   */
  async fetchReconciledPositions(dealIds: string[]) {
    const { data, error } = await supabase
      .from('trade_ledger')
      .select('broker_transaction_id, initial_sl, initial_tp, id')
      .in('broker_transaction_id', dealIds);

    if (error) {
      console.error('Error fetching reconciled positions:', error);
      return [];
    }

    return data;
  }

  /**
   * Fetches trade suggestions from the AI.
   */
  async fetchTradeSuggestions() {
    const { data, error } = await supabase
      .from('trade_suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trade suggestions:', error);
      throw error;
    }

    return data;
  }

  /**
   * Updates the user confirmation status of a trade suggestion.
   */
  async updateSuggestionStatus(id: string, isConfirmed: boolean) {
    const { data, error } = await supabase
      .from('trade_suggestions')
      .update({ 
        user_confirmed: isConfirmed,
        decision_status: isConfirmed ? 'ACCEPTED' : 'REJECTED'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating suggestion status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Logs a specific activity related to a trade (e.g. Entry, Modification, Closure).
   */
  async logTradeActivity(activity: {
    trade_ledger_id: string;
    activity_type: 'ENTRY' | 'MODIFICATION' | 'CLOSURE';
    price?: number;
    stop_loss?: number | null;
    take_profit?: number | null;
    pnl?: number;
    broker_response?: any;
  }) {
    const { data, error } = await supabase
      .from('trade_activities')
      .insert({
        trade_ledger_id: activity.trade_ledger_id,
        activity_type: activity.activity_type,
        price: activity.price,
        stop_loss: activity.stop_loss,
        take_profit: activity.take_profit,
        pnl: activity.pnl,
        broker_response: activity.broker_response
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging trade activity:', error);
      throw error;
    }

    return data;
  }

  /**
   * Fetches the complete trade history, joined with AI reasoning logs and granular activities.
   */
  async fetchTradeHistory() {
    const { data, error } = await supabase
      .from('trade_ledger')
      .select(`
        *,
        market_snapshots!market_snapshot_id (*),
        ai_logs!trade_ledger_id (*),
        trade_activities!fk_trade_activities_ledger (*),
        initiating_suggestion:trade_suggestions!trade_suggestion_id (*),
        related_suggestions:trade_suggestions!trade_ledger_id (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trade history:', error);
      throw error;
    }

    // DEBUG: Ensure broker_response is being fetched
    if (data && data.length > 0) {
      console.log(`Fetched ${data.length} trade records. Sample broker_response type: ${typeof data[0].broker_response}`);
    }

    return data;
  }
}

export const persistenceService = new PersistenceService();
