import { brokerService } from "./BrokerService.js";
import { calendarService, type CalendarEvent } from "./CalendarService.js";
import { persistenceService } from "./PersistenceService.js";
import { RSI, SMA, ATR } from 'technicalindicators';

export interface CompiledContext {
  symbol: string;
  history_3d: any[];
  current_spread: number;
  economic_events: CalendarEvent[];
  active_trade?: {
    entry_price: number;
    stop_loss: number | null;
    take_profit: number | null;
    current_pnl: number;
    direction: string;
    size: number;
  } | null;
  timestamp: string;
}

export class ContextAggregator {
  /**
   * Helper to calculate institutional-grade indicators.
   */
  private calculateIndicators(candles: any[]) {
    if (candles.length < 200) return null;

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const rsiVal = RSI.calculate({ values: closes, period: 14 });
    const sma50Val = SMA.calculate({ values: closes, period: 50 });
    const sma200Val = SMA.calculate({ values: closes, period: 200 });
    const atrVal = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });

    const currentPrice = closes[closes.length - 1];
    const s50 = sma50Val[sma50Val.length - 1];
    const s200 = sma200Val[sma200Val.length - 1];

    return {
      rsi: Number((rsiVal[rsiVal.length - 1] || 0).toFixed(2)),
      sma50: Number((s50 || 0).toFixed(5)),
      sma200: Number((s200 || 0).toFixed(5)),
      atr: Number((atrVal[atrVal.length - 1] || 0).toFixed(5)),
      price_relative_to_sma50: s50 ? Number((((currentPrice - s50) / s50) * 100).toFixed(4)) : 0,
      price_relative_to_sma200: s200 ? Number((((currentPrice - s200) / s200) * 100).toFixed(4)) : 0,
    };
  }

  /**
   * Charlie's Institutional Intelligence: Summarizes raw data into actionable insights for the LLM.
   */
  private generateReadableSummary(currentPrice: number, history15m: any[], history1h: any[], economicEvents: any[]) {
    // 1. Price Summary (Last 3 hours)
    const threeHoursAgo = history15m.slice(-12)[0]; // 12 * 15m = 3h
    const pipDiff = (currentPrice - (threeHoursAgo?.close || currentPrice)) * 10000;
    const priceTrend = `${Math.abs(pipDiff).toFixed(1)} pips ${pipDiff >= 0 ? 'risen' : 'dropped'} over the last 3 hours.`;

    // 2. Level Analysis (Support/Resistance over 3 days)
    const allHighs = history1h.map(c => c.high);
    const allLows = history1h.map(c => c.low);
    const resistance = Math.max(...allHighs);
    const support = Math.min(...allLows);
    
    const distToSupport = (currentPrice - support) * 10000;
    const distToResistance = (resistance - currentPrice) * 10000;
    
    let levelAnalysis = `Current price ${currentPrice.toFixed(5)} is `;
    if (distToSupport < 20) levelAnalysis += `approaching major 3-day support at ${support.toFixed(5)} (${distToSupport.toFixed(1)} pips away).`;
    else if (distToResistance < 20) levelAnalysis += `approaching major 3-day resistance at ${resistance.toFixed(5)} (${distToResistance.toFixed(1)} pips away).`;
    else levelAnalysis += `trading mid-range between support (${support.toFixed(5)}) and resistance (${resistance.toFixed(5)}).`;

    // 3. Event Alignment
    const nowMs = Date.now();
    const highImpact = economicEvents.find(e => e.impact === "High" && new Date(e.date).getTime() > nowMs);
    let eventAlignment = "No immediate high-impact news scheduled.";
    if (highImpact) {
      const minutesUntil = Math.floor((new Date(highImpact.date).getTime() - nowMs) / 60000);
      eventAlignment = `High Impact News (${highImpact.event}) is scheduled in ${minutesUntil} minutes.`;
    }

    return {
      price_trend: priceTrend,
      level_analysis: levelAnalysis,
      event_alignment: eventAlignment
    };
  }

  /**
   * Generates a comprehensive, read-only market context for the AI Strategist.
   */
  async generateMarketContext(symbol: string = "EURUSD"): Promise<any> {
    const now = new Date();
    
    // Parse currencies from symbol (e.g., EURUSD -> [EUR, USD])
    const baseCurrency = symbol.substring(0, 3);
    const quoteCurrency = symbol.substring(3, 6);
    const targetCurrencies = [baseCurrency, quoteCurrency];

    // 1. Fetch Multi-Timeframe History
    const [history15m, history1h, history1d] = await Promise.all([
      brokerService.getHistoricalPrices(symbol, "MINUTE_15", 400),
      brokerService.getHistoricalPrices(symbol, "HOUR", 400),
      brokerService.getHistoricalPrices(symbol, "DAY", 40)
    ]);

    if (history15m.length === 0) {
      throw new Error("No market data available for context generation.");
    }

    const currentPrice = history15m[history15m.length - 1].close;

    // 2. Fetch Economic Calendar for current day + next 24 hours (High & Medium)
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Bob: Fixed empty array by filtering for base/quote currencies correctly
    const economicEvents = await calendarService.getEconomicCalendar(todayStr, tomorrowStr, ["High", "Medium"], targetCurrencies);

    // 3. Institutional Summaries (Charlie's Requirement)
    const intelligence = this.generateReadableSummary(currentPrice, history15m, history1h, economicEvents);

    // 4. Trend Analysis
    const last24h = history1h.slice(-24);
    const h24High = Math.max(...last24h.map(c => c.high));
    const h24Low = Math.min(...last24h.map(c => c.low));
    const h24RangePercent = Number((((currentPrice - h24Low) / (h24High - h24Low)) * 100).toFixed(2));

    // 5. Institutional Indicators
    const indicators15m = this.calculateIndicators(history15m);
    const indicators1h = this.calculateIndicators(history1h);

    // 6. Active Trade Data
    const positionsData = await brokerService.getPositions();
    const activePosition = (positionsData.positions || []).find((p: any) => p.market.epic === symbol);

    let activeTrade = null;
    if (activePosition) {
      const bid = (brokerService as any).tickProvider ? (brokerService as any).tickProvider()?.bid : activePosition.market.bid;
      const ask = (brokerService as any).tickProvider ? (brokerService as any).tickProvider()?.ask : activePosition.market.offer;
      const tradePrice = activePosition.position.direction === "BUY" ? bid : ask;
      const entryPrice = activePosition.position.level;
      const size = activePosition.position.size;
      
      activeTrade = {
        entry_price: entryPrice,
        stop_loss: activePosition.position.stopLevel || null,
        take_profit: activePosition.position.limitLevel || null,
        current_pnl: Number(((tradePrice - entryPrice) * size * (activePosition.position.direction === "BUY" ? 1 : -1)).toFixed(2)),
        direction: activePosition.position.direction,
        size: size
      };
    }

    const contextPayload = {
      symbol,
      current_price: currentPrice,
      intelligence: intelligence, // Charlie's human-readable insights
      trend_analysis: {
        h24_position_percent: h24RangePercent,
        h24_high: h24High,
        h24_low: h24Low
      },
      technical_indicators: {
        m15: indicators15m,
        h1: indicators1h
      },
      economic_calendar: economicEvents,
      active_trade: activeTrade,
      timestamp: now.toISOString()
    };

    // 7. Persistence: Log to context_logs in Supabase
    try {
      await persistenceService.logContext(symbol, contextPayload);
    } catch (err) {
      console.error("Failed to log context to Supabase:", err);
    }

    return contextPayload;
  }

  // Maintaining compatibility with previous method if used elsewhere
  async compileTradeContext(epic: string = "EURUSD"): Promise<CompiledContext> {
    const context = await this.generateMarketContext(epic);
    return {
      symbol: epic,
      history_3d: [], // Deprecated in favor of intelligence summary
      current_spread: 0,
      economic_events: context.economic_calendar,
      active_trade: context.active_trade,
      timestamp: context.timestamp
    };
  }
}

export const contextAggregator = new ContextAggregator();
