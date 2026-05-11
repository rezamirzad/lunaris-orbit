import express from "express";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { BrokerService } from "./services/BrokerService.js";
import { WebSocketManager } from "./services/WebSocketManager.js";

const app = express();
const httpServer = createServer(app);

app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Parse JSON bodies

const broker = new BrokerService();
const wsManager = new WebSocketManager(httpServer, broker);

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

app.post("/api/trade", tradeLimiter, async (req, res) => {
  const { direction, size, stopLoss, takeProfit } = req.body;
  const epic = "EURUSD"; // Default epic as per user flow

  if (!direction || !size) {
    return res.status(400).json({ error: "Missing required trade parameters" });
  }

  try {
    // Safety check: available equity multiplied by leverage (1:30)
    const accountData = await broker.getAccountData();
    const available = accountData.accountInfo?.available || 0;
    const maxExposure = available * 30;

    if (Number(size) > maxExposure) {
      return res.status(400).json({ 
        error: `Insufficient margin. Max allowed exposure: €${maxExposure.toFixed(2)} (Available: €${available.toFixed(2)} x 30 leverage)` 
      });
    }

    const data = await broker.placeMarketOrder(epic, direction, Number(size), stopLoss, takeProfit);
    res.json(data);
  } catch (error: any) {
    console.error("Trade Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend live on port ${PORT}`);
  wsManager.start().catch(console.error);
});
