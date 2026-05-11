import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import WebSocket from "ws";
import { BrokerService } from "./BrokerService.js";

export class WebSocketManager {
  private io: SocketServer;
  private brokerWs: WebSocket | null = null;
  private lastTickTime = 0;
  private readonly THROTTLE_MS = 500; // 2 ticks per second

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

  private handleBrokerMessage(data: WebSocket.Data) {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.destination === "quote" && msg.payload?.epic === "EURUSD") {
        const now = Date.now();
        if (now - this.lastTickTime >= this.THROTTLE_MS) {
          const tick = {
            symbol: "EURUSD",
            bid: msg.payload.bid,
            ask: msg.payload.ofr,
            timestamp: new Date().toISOString()
          };
          
          this.io.emit("price", tick);
          this.lastTickTime = now;
        }
      }
    } catch (e) {
      // Non-JSON or malformed
    }
  }
}
