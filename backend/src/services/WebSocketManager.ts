import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import WebSocket from "ws";
import { BrokerService } from "./BrokerService.js";

export class WebSocketManager {
  private io: SocketServer;
  private brokerWs: WebSocket | null = null;
  private lastTickTime = 0;
  private readonly THROTTLE_MS = 500; // 2 ticks per second
  private positions: any[] = [];
  private lastPositionFetch = 0;
  private readonly POSITION_REFRESH_MS = 5000;
  private latestTick: { symbol: string; bid: number; ask: number; time: number; timestamp: string } | null = null;

  constructor(server: HttpServer, private brokerService: BrokerService) {
    this.io = new SocketServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on("connection", (socket) => {
      console.log("Client connected to Socket.io price stream");
      socket.on("disconnect", () => {
        console.log("Client disconnected from Socket.io price stream");
      });
    });
  }

  public async start() {
    await this.connectToBroker();
  }

  public getLatestTick() {
    return this.latestTick;
  }

  /**
   * Captures a high-fidelity market snapshot formatted for Supabase.
   */
  public captureSnapshot(epic: string) {
    const tick = this.latestTick;
    const bid = tick?.bid || 0;
    const ask = tick?.ask || 0;

    return {
      symbol: epic,
      ohlcv: {
        open: bid,
        high: bid,
        low: bid,
        close: bid,
        volume: 0
      },
      market_context: {
        bid: bid,
        ask: ask,
        spread: Number((ask - bid).toFixed(5)),
        timestamp: tick?.timestamp || new Date().toISOString()
      }
    };
  }

  private async connectToBroker() {
    try {
      const { cst, securityToken, streamingHost } = await this.brokerService.authenticate();
      
      if (!cst || !securityToken || !streamingHost) {
        throw new Error("Authentication failed, missing tokens or host");
      }

      const wsUrl = `${streamingHost}connect`;
      console.log(`Connecting to Capital.com at ${wsUrl}...`);
      
      this.brokerWs = new WebSocket(wsUrl);

      this.brokerWs.on("open", () => {
        console.log("Connected to Capital.com Streaming API");
        this.subscribe(cst, securityToken);
      });

      this.brokerWs.on("message", (data) => {
        this.handleBrokerMessage(data);
      });

      this.brokerWs.on("close", () => {
        console.log("Broker connection closed, reconnecting...");
        setTimeout(() => this.connectToBroker(), 5000);
      });

      this.brokerWs.on("error", (err) => {
        console.error("Broker WS Error:", err);
      });

    } catch (err) {
      console.error("Failed to connect to broker stream:", err);
      setTimeout(() => this.connectToBroker(), 10000);
    }
  }

  private subscribe(cst: string, securityToken: string) {
    if (!this.brokerWs || this.brokerWs.readyState !== WebSocket.OPEN) return;

    const subMsg = {
      destination: "marketData.subscribe",
      correlationId: "eurusd-sub",
      cst,
      securityToken,
      payload: { epics: ["EURUSD"] }
    };

    this.brokerWs.send(JSON.stringify(subMsg));
  }

  private async handleBrokerMessage(data: WebSocket.Data) {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.destination === "quote" && msg.payload?.epic === "EURUSD") {
        const now = Date.now();
        
        // Refresh positions cache if expired
        if (now - this.lastPositionFetch >= this.POSITION_REFRESH_MS) {
          try {
            const data = await this.brokerService.getPositions();
            this.positions = data.positions || [];
            this.lastPositionFetch = now;
          } catch (e) {
            console.error("Failed to refresh positions for P&L:", e);
          }
        }

        if (now - this.lastTickTime >= this.THROTTLE_MS) {
          const bid = msg.payload.bid;
          const ask = msg.payload.ofr;
          
          const tick = {
            symbol: "EURUSD",
            bid,
            ask,
            time: Math.floor(Date.now() / 1000),
            timestamp: new Date().toISOString()
          };
          this.latestTick = tick;
          
          // Calculate P&L for open positions
          const pnlUpdates = this.positions
            .filter(pos => pos.market.epic === "EURUSD")
            .map(pos => {
              const direction = pos.position.direction;
              const entryPrice = pos.position.level;
              const size = pos.position.size;
              
              // P&L calculation: (Current Price - Entry Price) * Size
              // For BUY, we close at BID. For SELL, we close at ASK.
              const currentPrice = direction === "BUY" ? bid : ask;
              const pnl = direction === "BUY" 
                ? (currentPrice - entryPrice) * size
                : (entryPrice - currentPrice) * size;
              
              return {
                dealId: pos.position.dealId,
                pnl: Number(pnl.toFixed(2)),
                currentPrice
              };
            });
          
          this.io.emit("price", tick);
          if (pnlUpdates.length > 0) {
            this.io.emit("pnl_update", pnlUpdates);
          }
          
          this.lastTickTime = now;
        }
      }
    } catch (e) {
      // Non-JSON or malformed
    }
  }
}
