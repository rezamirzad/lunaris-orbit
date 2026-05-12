import express from "express";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { BrokerService, brokerService } from "./services/BrokerService.js";
import { WebSocketManager } from "./services/WebSocketManager.js";
import { calendarService } from "./services/CalendarService.js";
import { orbitAI } from "./services/OrbitAI.js";
import { persistenceService } from "./services/PersistenceService.js";
import { contextAggregator } from "./services/ContextAggregator.js";

const app = express();
const httpServer = createServer(app);

app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Parse JSON bodies

const broker = new BrokerService();
const wsManager = new WebSocketManager(httpServer, broker);

// Wire tick provider for market snapshots
broker.setTickProvider(() => wsManager.getLatestTick());

// Rate limiter to prevent double-clicks/spam
const tradeLimiter = rateLimit({
  windowMs: 2000, // 2 seconds
  max: 1, // Limit each IP to 1 request per windowMs
  message: { error: "Too many trade requests, please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/account", async (req, res) => {
  try {
    const data = await broker.getAccountData("EURUSD");
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/market/history", async (req, res) => {
  const { epic = "EURUSD", resolution = "MINUTE", max = "1000" } = req.query;
  
  try {
    const history = await broker.getHistoricalPrices(
      epic as string, 
      resolution as string, 
      parseInt(max as string)
    );

    if (history.length === 0) {
      return res.json([
        { time: Math.floor(Date.now() / 1000) - 60, open: 1.17, high: 1.171, low: 1.169, close: 1.17 }
      ]);
    }

    const latest = wsManager.getLatestTick();
    if (latest && latest.symbol === epic) {
      const lastCandle = history[history.length - 1];
      if (latest.time > lastCandle.time) {
        history.push({
          time: latest.time,
          open: latest.bid,
          high: Math.max(latest.bid, latest.ask),
          low: Math.min(latest.bid, latest.ask),
          close: latest.bid
        });
      }
    }

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/market/context", async (req, res) => {
  const { symbol = "EURUSD" } = req.query;
  try {
    const context = await contextAggregator.generateMarketContext(symbol as string);
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/market/context", async (req, res) => {
  const { symbol = "EURUSD" } = req.query;
  try {
    const context = await contextAggregator.generateMarketContext(symbol as string);
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/suggest", async (req, res) => {
  const { symbol = "EURUSD" } = req.body;
  try {
    const context = await contextAggregator.generateMarketContext(symbol as string);
    const suggestion = await orbitAI.generateSuggestion(context);

    const savedSuggestion = await persistenceService.insertTradeSuggestion({
      pair: symbol as string,
      action: suggestion.action,
      amount: suggestion.size,
      stop_loss: suggestion.sl,
      take_profit: suggestion.tp,
      confidence_score: suggestion.confidence,
      reasoning: suggestion.primary_reason,
      suggestion_type: 'NEW_TRADE'
    });

    res.json({ suggestion: savedSuggestion, context });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/analyze-active", async (req, res) => {
  const { trade_id, symbol = "EURUSD", entry, sl, tp, current_price } = req.body;
  try {
    const context = await contextAggregator.generateMarketContext(symbol as string);
    const analysis = await orbitAI.analyzeActiveTrade(context, { 
      dealId: trade_id, 
      entry, 
      sl, 
      tp, 
      current_price 
    });

    const savedSuggestion = await persistenceService.insertTradeSuggestion({
      pair: symbol as string,
      action: analysis.recommendation === 'CLOSE_NOW' ? 'SELL' : 'HOLD',
      amount: 0,
      confidence_score: 100,
      reasoning: analysis.reasoning,
      suggestion_type: 'ACTIVE_ANALYSIS'
    });

    res.json({ analysis: savedSuggestion, raw_ai: analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/execute-trade", async (req, res) => {
  const { epic, direction, size, sl, tp, requestId } = req.body;

  // Alice: Institutional Boundary Checks
  if (direction === 'BUY') {
    if (sl && sl >= req.body.currentPrice) {
      return res.status(400).json({ error: "INVALID_BOUNDARIES: Stop Loss must be below current price for BUY trades." });
    }
    if (tp && tp <= req.body.currentPrice) {
      return res.status(400).json({ error: "INVALID_BOUNDARIES: Take Profit must be above current price for BUY trades." });
    }
  } else if (direction === 'SELL') {
    if (sl && sl <= req.body.currentPrice) {
      return res.status(400).json({ error: "INVALID_BOUNDARIES: Stop Loss must be above current price for SELL trades." });
    }
    if (tp && tp >= req.body.currentPrice) {
      return res.status(400).json({ error: "INVALID_BOUNDARIES: Take Profit must be below current price for SELL trades." });
    }
  }

  try {
    const snapshot = await broker.captureSnapshot(epic);
    const data = await broker.placeMarketOrder(epic, direction, size, sl, tp);

    // Log with Initial Risk Parameters (Diana & Alice)
    await persistenceService.insertTradeLog({
      market_snapshot_id: snapshot.id,
      broker_transaction_id: data.dealReference,
      direction,
      size,
      entry_price: req.body.currentPrice || 0,
      stop_loss: sl,
      take_profit: tp,
      initial_sl: sl,
      initial_tp: tp,
      initial_max_profit_potential: tp ? Math.abs(tp - req.body.currentPrice) * size : null,
      initial_max_loss_potential: sl ? Math.abs(req.body.currentPrice - sl) * size : null,
      status: 'EXECUTED',
      broker_response: data
    });

    res.json({ dealReference: data.dealReference });
  } catch (error: any) {
    const brokerError = error.response?.data;
    const errorCode = brokerError?.errorCode || "UNKNOWN_ERROR";
    const errorMessage = brokerError?.message || error.message;
    
    console.error("Execute Trade Error:", { errorCode, errorMessage, details: brokerError });
    
    // Diana: Return 400 with exact broker message so frontend can display it
    res.status(400).json({ 
      error: errorMessage,
      errorCode: errorCode,
      details: brokerError
    });
  }
});

app.put("/api/modify-trade", async (req, res) => {
  const { deal_id, new_sl, new_tp } = req.body;
  try {
    const data = await broker.modifyPosition(deal_id, new_sl, new_tp);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/close-trade", async (req, res) => {
  const { deal_id } = req.body;
  try {
    const data = await broker.closePosition(deal_id);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/consult", async (req, res) => {
  // Legacy alias, redirecting to suggest
  res.redirect(307, "/api/ai/suggest");
});


app.get("/api/history", async (req, res) => {
  // Legacy alias
  res.redirect(301, `/api/market/history?${new URLSearchParams(req.query as any).toString()}`);
});

app.get("/api/account/live", async (req, res) => {
  try {
    const data = await broker.getAccountData();
    const account = data.accountInfo || {};
    
    // Optimized payload for frontend useAccountStore
    res.json({
      balance: account.balance || 0,
      available_margin: account.available || 0,
      used_margin: account.deposit || 0,
      unrealized_pnl: account.profitLoss || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/portfolio/active", async (req, res) => {
  try {
    // 1. Fetch unquestionable state from Capital.com
    const [positionsResponse, ordersResponse] = await Promise.all([
      broker.getPositions(),
      broker.getWorkingOrders()
    ]);

    const livePositions = positionsResponse.positions || [];
    const workingOrders = ordersResponse.workingOrders || [];
    
    if (livePositions.length === 0) {
      return res.json([]);
    }

    const dealIds = livePositions.map((p: any) => p.position.dealId);

    // 2. Reconcile with Supabase Ledger (Diana's Requirement)
    const ledgerData = await persistenceService.fetchReconciledPositions(dealIds);

    // 3. Map to unified payload for Evan's UI
    const reconciled = livePositions.map((p: any) => {
      const audit = ledgerData.find((l: any) => l.broker_transaction_id === p.position.dealId);
      
      // DEBUG: Verify exact JSON keys sent by Capital.com for this specific deal
      console.log("RAW BROKER POSITION:", JSON.stringify(p.position, null, 2));

      // Capital.com SL/TP Mapping from attached working orders if not in position directly
      let sl = p.position.stopLevel;
      let tp = p.position.profitLevel || p.position.limitLevel;

      const relatedOrders = workingOrders.filter((o: any) => o.workingOrderData.positionId === p.position.dealId);
      
      if (!sl) {
        const slOrder = relatedOrders.find((o: any) => o.workingOrderData.orderType === 'STOP');
        if (slOrder) sl = slOrder.workingOrderData.level;
      }
      
      if (!tp) {
        const tpOrder = relatedOrders.find((o: any) => o.workingOrderData.orderType === 'LIMIT');
        if (tpOrder) tp = tpOrder.workingOrderData.level;
      }

      const bid = wsManager.getLatestTick()?.bid || p.market.bid;
      const ask = wsManager.getLatestTick()?.ask || p.market.offer;
      const currentPrice = p.position.direction === 'BUY' ? bid : ask;

      return {
        dealId: p.position.dealId,
        epic: p.market.epic,
        direction: p.position.direction,
        size: p.position.size,
        entryPrice: p.position.level,
        livePrice: currentPrice,
        sl: sl,
        tp: tp,
        pnl: p.position.upl, // Unrealized P&L from broker
        initial_sl: audit?.initial_sl,
        initial_tp: audit?.initial_tp
      };
    });

    res.json(reconciled);
  } catch (error: any) {
    console.error("Portfolio Fetch Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/positions", async (req, res) => {
  // Legacy alias, redirecting to active
  res.redirect(307, "/api/portfolio/active");
});

app.delete("/api/positions/:dealId", async (req, res) => {
  const { dealId } = req.params;
  const { size } = req.body;
  try {
    const data = await broker.closePosition(dealId, size);
    res.json(data);
  } catch (error: any) {
    const errorCode = error.response?.data?.errorCode || error.message;
    console.error("Close Position Error:", {
      dealId,
      errorCode,
      details: error.response?.data || error.message
    });
    res.status(500).json({ errorCode });
  }
});

app.post("/api/trade", tradeLimiter, async (req, res) => {
  const { direction, size, stopLoss, takeProfit } = req.body;
  const epic = "EURUSD"; // Default epic as per user flow

  // Security: Basic request validation
  if (!direction || size === undefined || size === null) {
    return res.status(400).json({ error: "Missing required trade parameters" });
  }

  if (typeof size !== "number" || size <= 0) {
    return res.status(400).json({ error: "Trade size must be a positive number" });
  }

  try {
    // Safety check: available equity multiplied by leverage (1:30)
    const accountData = await broker.getAccountData();
    const available = accountData.accountInfo?.available || 0;
    const maxExposure = available * 30;

    if (size > maxExposure) {
      return res.status(400).json({ 
        error: `Insufficient margin. Max allowed exposure: €${maxExposure.toFixed(2)} (Available: €${available.toFixed(2)} x 30 leverage)` 
      });
    }

    const data = await broker.placeMarketOrder(epic, direction, size, stopLoss, takeProfit);
    
    // Return the dealReference as requested
    if (data.dealReference) {
      res.json({ dealReference: data.dealReference });
    } else {
      res.json(data);
    }
  } catch (error: any) {
    // Security: Only log sanitized error information, avoid logging sensitive tokens
    console.error("Trade Error:", {
      message: error.message,
      status: error.response?.status,
      errorCode: error.response?.data?.errorCode,
      epic,
      direction,
      size
    });
    
    // Return specific broker errorCode on failure as requested
    const errorCode = error.response?.data?.errorCode || "UNKNOWN_ERROR";
    res.status(500).json({ errorCode });
  }
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend live on port ${PORT}`);
  wsManager.start().catch(console.error);
});
