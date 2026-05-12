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
  async insertTradeLog(trade: TradeLog) {
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
        broker_response: trade.broker_response
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
   * Updates an existing trade record (e.g., when a position is closed).
   */
  async updateTradeStatus(dealId: string, status: string, additionalResponse?: any) {
    const { data, error } = await supabase
      .from('trade_ledger')
      .update({ 
        status,
        broker_response: additionalResponse 
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
    stop_loss?: number, 
    take_profit?: number, 
    confidence_score: number,
    reasoning?: string,
    suggestion_type?: 'NEW_TRADE' | 'ACTIVE_ANALYSIS'
  }) {
    const { data, error } = await supabase
      .from('trade_suggestions')
      .insert({
        pair: suggestion.pair,
        action: suggestion.action,
        amount: suggestion.amount,
        stop_loss: suggestion.stop_loss,
        take_profit: suggestion.take_profit,
        confidence_score: suggestion.confidence_score,
        reasoning: suggestion.reasoning,
        suggestion_type: suggestion.suggestion_type || 'NEW_TRADE',
        is_automated: false,
        user_confirmed: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting trade suggestion:', error);
      throw error;
    }

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
      .select('broker_transaction_id, initial_sl, initial_tp')
      .in('broker_transaction_id', dealIds);

    if (error) {
      console.error('Error fetching reconciled positions:', error);
      return [];
    }

    return data;
  }
}

export const persistenceService = new PersistenceService();
