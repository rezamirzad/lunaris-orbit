import axios, { type AxiosInstance } from "axios";

export class BrokerService {
  private client: AxiosInstance;
  private cst: string | null = null;
  private securityToken: string | null = null;
  private streamingHost: string | null = null;
  private sessionData: any = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.CAPITAL_API_URL,
      headers: {
        "X-CAP-API-KEY": process.env.CAPITAL_API_KEY,
        "Content-Type": "application/json",
      },
    });
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

  async placeMarketOrder(epic: string, direction: "BUY" | "SELL", size: number, stopLoss: number | null = null, takeProfit: number | null = null) {
    if (!this.cst || !this.securityToken) {
      await this.authenticate();
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
      if (takeProfit) payload.limitLevel = takeProfit;

      const response = await this.client.post(
        "/api/v1/positions/otc",
        payload,
        {
          headers: {
            CST: this.cst,
            "X-SECURITY-TOKEN": this.securityToken,
          },
        }
      );

      return response.data;
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
        if (takeProfit) payload.limitLevel = takeProfit;

        const retryResponse = await this.client.post(
          "/api/v1/positions/otc",
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
}
