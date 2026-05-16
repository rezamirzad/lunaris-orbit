import axios, { type AxiosInstance } from "axios";
import { persistenceService } from "./PersistenceService.js";

export class BrokerService {
  private client: AxiosInstance;
  private cst: string | null = null;
  private securityToken: string | null = null;
  private streamingHost: string | null = null;
  private sessionData: any = null;
  private tickProvider: ((epic: string) => any) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.CAPITAL_API_URL,
      headers: {
        "X-CAP-API-KEY": process.env.CAPITAL_API_KEY,
        "Content-Type": "application/json",
      },
    });
  }

  public setTickProvider(provider: (epic: string) => any) {
    this.tickProvider = provider;
  }

  public getCST() {
    return this.cst;
  }

  public getSecurityToken() {
    return this.securityToken;
  }

  public getStreamingHost() {
    return this.streamingHost;
  }

  async captureSnapshot(epic: string) {
    const tick = this.tickProvider ? this.tickProvider(epic) : null;
    
    // Fallback if no tick provider or no data yet
    const bid = tick?.bid || 0;
    const ask = tick?.ask || 0;
    
    return await persistenceService.insertMarketSnapshot({
      symbol: epic,
      ohlcv: { open: bid, high: bid, low: bid, close: bid, volume: 0 }, // Simplified for MVP
      market_context: {
        bid: bid,
        ask: ask,
        spread: Number((ask - bid).toFixed(5))
      }
    });
  }

  async authenticate() {
    const auth = await this.client.post("/api/v1/session", {
      identifier: process.env.CAPITAL_IDENTIFIER,
      password: process.env.CAPITAL_API_PASSWORD,
    });

    this.cst = auth.headers["cst"];
    this.securityToken = auth.headers["x-security-token"];
    this.streamingHost = auth.data.streamingHost;
    this.sessionData = auth.data;

    return { 
      cst: this.cst, 
      securityToken: this.securityToken,
      streamingHost: this.streamingHost,
      sessionData: this.sessionData
    };
  }

  async getMarketDetails(epic: string) {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get(`/api/v1/markets/${epic}`, {
        headers: {
          CST: this.cst,
          "X-SECURITY-TOKEN": this.securityToken,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching market details for ${epic}:`, error.message);
      throw error;
    }
  }

  async getAccountData(epicToInclude?: string) {
    // 1. Authenticate if tokens are missing
    if (!this.cst || !this.securityToken || !this.sessionData) {
      await this.authenticate();
    }

    // 2. Fetch Account Details using tokens
    const response = await this.client.get("/api/v1/accounts", {
      headers: {
        CST: this.cst,
        "X-SECURITY-TOKEN": this.securityToken,
      },
    });

    const accounts = response.data.accounts || [];
    const currentAccount = accounts.find((a: any) => a.accountId === this.sessionData.currentAccountId) || accounts[0];

    let marketDetails = null;
    if (epicToInclude) {
      try {
        marketDetails = await this.getMarketDetails(epicToInclude);
      } catch (e) {
        // Silently fail or log
      }
    }

    // Return combined data: session info + the specific current account's latest info + optional market details
    return {
      ...this.sessionData,
      accountInfo: currentAccount?.balance || this.sessionData.accountInfo,
      accountsList: accounts,
      marketDetails: marketDetails
    };
  }

  async placeMarketOrder(epic: string, direction: "BUY" | "SELL", size: number, stopLoss: number | null = null, takeProfit: number | null = null, reasoning?: string, confidence?: number, suggestionId?: string, contextId?: string) {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
    }

    // 1. Capture Market Snapshot (Bob's requirement)
    let snapshot: any;
    try {
      snapshot = await this.captureSnapshot(epic);
    } catch (err) {
      console.error("Failed to capture snapshot, proceeding without it", err);
    }

    try {
      const payload: any = {
        epic,
        direction,
        size,
        symbol: null,
        activePnl: null,
        expiry: "-",
        guaranteedStop: false,
        orderType: "MARKET",
        timeInForce: "FILL_OR_KILL",
        trailingStop: false,
        trailingStopIncrement: null,
      };

      if (stopLoss) payload.stopLevel = stopLoss;
      if (takeProfit) payload.profitLevel = takeProfit;

      const response = await this.client.post(
        "/api/v1/positions",
        payload,
        {
          headers: {
            CST: this.cst,
            "X-SECURITY-TOKEN": this.securityToken,
          },
        }
      );

      // 2. Persistence: Log trade (Institutional Audit)
      try {
        const bid = snapshot?.market_context?.bid || 0;
        const ask = snapshot?.market_context?.ask || 0;
        const entryPrice = direction === 'BUY' ? ask : bid;
        
        // Static P&L Projections for EUR/USD (Base EUR account)
        const calculatePotential = (target: number) => {
          if (!entryPrice) return 0;
          const rawUsdPnL = direction === 'BUY' ? (target - entryPrice) * size : (entryPrice - target) * size;
          return rawUsdPnL / entryPrice; // Convert to EUR using entry rate
        };

        const ledger = await persistenceService.insertTradeLog({
          market_snapshot_id: snapshot?.id,
          broker_transaction_id: response.data.dealReference,
          direction,
          size,
          entry_price: entryPrice,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          initial_sl: stopLoss,
          initial_tp: takeProfit,
          initial_max_profit_potential: takeProfit ? calculatePotential(takeProfit) : null,
          initial_max_loss_potential: stopLoss ? calculatePotential(stopLoss) : null,
          status: 'EXECUTED',
          broker_response: response.data,
          trade_suggestion_id: suggestionId,
          context_log_id: contextId
        });

        // 3. Log Initial Activity (Grouped History)
        await persistenceService.logTradeActivity({
          trade_ledger_id: ledger.id,
          activity_type: 'ENTRY',
          price: entryPrice,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          broker_response: response.data
        });

        // 4. AI Reasoning Audit
        if (reasoning) {
          await persistenceService.logAIReasoning(
            ledger.id,
            snapshot.id,
            { reasoning },
            confidence || 0
          );
        }

        return response.data;
      } catch (logError) {
        console.error("Failed to log trade to persistence:", logError);
        return response.data; // Still return success since broker order went through
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, re-authenticate and retry once
        await this.authenticate();
        
        const payload: any = {
          epic,
          direction,
          size,
          orderType: "MARKET",
        };
        if (stopLoss) payload.stopLevel = stopLoss;
        if (takeProfit) payload.profitLevel = takeProfit; // FIXED: Changed limitLevel to profitLevel

        const retryResponse = await this.client.post(
          "/api/v1/positions",
          payload,
          {
            headers: {
              CST: this.cst,
              "X-SECURITY-TOKEN": this.securityToken,
            },
          }
        );
        return retryResponse.data;
      }
      throw error;
    }
  }

  async getPositions() {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get("/api/v1/positions", {
        headers: {
          CST: this.cst,
          "X-SECURITY-TOKEN": this.securityToken,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.authenticate();
        const retryResponse = await this.client.get("/api/v1/positions", {
          headers: {
            CST: this.cst,
            "X-SECURITY-TOKEN": this.securityToken,
          },
        });
        return retryResponse.data;
      }
      throw error;
    }
  }

  async getWorkingOrders() {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get("/api/v1/workingorders", {
        headers: {
          CST: this.cst,
          "X-SECURITY-TOKEN": this.securityToken,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.authenticate();
        const retryResponse = await this.client.get("/api/v1/workingorders", {
          headers: {
            CST: this.cst,
            "X-SECURITY-TOKEN": this.securityToken,
          },
        });
        return retryResponse.data;
      }
      throw error;
    }
  }

  async getHistoricalPrices(epic: string, resolution: string = "MINUTE", max: number = 1000): Promise<any[]> {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get(`/api/v1/prices/${epic}`, {
        params: {
          resolution,
          max,
        },
        headers: {
          CST: this.cst,
          "X-SECURITY-TOKEN": this.securityToken,
        },
      });

      // Normalize data for Lightweight Charts
      return (response.data.prices || []).map((p: any) => ({
        time: Math.floor(new Date(p.snapshotTimeUTC).getTime() / 1000),
        open: p.openPrice.bid,
        high: p.highPrice.bid,
        low: p.lowPrice.bid,
        close: p.closePrice.bid,
      }));
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.authenticate();
        return this.getHistoricalPrices(epic, resolution, max);
      }
      console.error(`Error fetching historical prices for ${epic}:`, error.message);
      throw error;
    }
  }

  async modifyPosition(dealId: string, stopLevel: number | null = null, profitLevel: number | null = null): Promise<any> {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
    }

    try {
      const payload: any = {};
      if (stopLevel) payload.stopLevel = stopLevel;
      if (profitLevel) payload.profitLevel = profitLevel;

      // Diana: Capital.com uses PUT /positions/{dealId} to modify SL/TP
      const response = await this.client.put(
        `/api/v1/positions/${dealId}`,
        payload,
        {
          headers: {
            CST: this.cst,
            "X-SECURITY-TOKEN": this.securityToken,
          },
        }
      );

      // Auditing: Update the ledger with new SL/TP
      let ledgerId = null;
      try {
        const ledger = await persistenceService.updateTradeStatus(dealId, 'MODIFIED', {
          broker_response: response.data,
          stop_loss: stopLevel,
          take_profit: profitLevel,
        });
        ledgerId = ledger.id;

        await persistenceService.logTradeActivity({
          trade_ledger_id: ledger.id,
          activity_type: 'MODIFICATION',
          stop_loss: stopLevel,
          take_profit: profitLevel,
          broker_response: response.data
        });
      } catch (err) {
        console.error("Failed to log position modification:", err);
      }

      // Return updated state so Evan can refresh UI
      return {
        ...response.data,
        ledgerId,
        stopLevel,
        profitLevel
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.authenticate();
        return this.modifyPosition(dealId, stopLevel, profitLevel);
      }
      console.error("Broker Modify Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async closePosition(dealId: string, size?: number): Promise<any> {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
    }

    try {
      let finalSize = size;

      // 1. If size not provided, fetch current positions to find it
      if (!finalSize) {
        const positionsData = await this.getPositions();
        const position = (positionsData.positions || []).find(
          (p: any) => p.position.dealId === dealId
        );

        if (!position) {
          throw new Error("POSITION_NOT_FOUND");
        }
        finalSize = position.position.size;
      }

      // 2. Send DELETE with body as required by Capital.com
      const response = await this.client.request({
        method: "DELETE",
        url: `/api/v1/positions/${dealId}`,
        data: {
          size: finalSize,
          orderType: "MARKET",
        },
        headers: {
          CST: this.cst,
          "X-SECURITY-TOKEN": this.securityToken,
        },
      });

      // Persistence: Capture snapshot and update trade status
      try {
        const snapshot = await this.captureSnapshot("EURUSD"); // Default epic
        const ledger = await persistenceService.updateTradeStatus(dealId, 'CLOSED', {
          close_snapshot_id: snapshot.id,
          close_response: response.data
        });

        await persistenceService.logTradeActivity({
          trade_ledger_id: ledger.id,
          activity_type: 'CLOSURE',
          price: snapshot.market_context.bid,
          broker_response: response.data
        });
      } catch (logError) {
        console.error("Failed to log position closure to persistence:", logError);
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.authenticate();
        // Retry logic for 401
        return this.closePosition(dealId, size);
      }
      throw error;
    }
  }
}

export const brokerService = new BrokerService();
