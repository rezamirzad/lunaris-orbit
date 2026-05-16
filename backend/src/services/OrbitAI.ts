import { getGeminiModel } from "../lib/gemini.js";
import { type CompiledContext } from "./ContextAggregator.js";

export interface TradeSuggestion {
  action: "BUY" | "SELL" | "HOLD";
  size: number;
  entry: number;
  tp: number;
  sl: number;
  confidence: number; // 0-100
  primary_reason: string;
}

export interface ActiveAnalysis {
  recommendation: "MODIFY_SL_TP" | "CLOSE_NOW" | "STAY";
  new_sl?: number;
  new_tp?: number;
  reasoning: string;
}

export class OrbitAIService {
  private model = getGeminiModel("gemini-flash-latest");

  /**
   * Prompt 1: New Trade Suggestion Logic (Institutional Strategist)
   */
  private getSuggestionPrompt(): string {
    return `You are an institutional Forex Strategist. Analyze the provided market context (3-day history, economic events, current spread).
You must decide whether to 'BUY', 'SELL', or 'HOLD'.

SIZING RULES:
1. You MUST output trade sizes in valid Capital.com unit increments.
2. For Forex, the DEFAULT size is 1000. Use between 1000 and 2500 for most trades unless you are extremely confident.
3. NEVER output a size of 1. If you think the trade is too risky for 1000 units, recommend 'HOLD' instead.

Output ONLY a strictly valid JSON object with these fields:
{
  "action": "BUY" | "SELL" | "HOLD",
  "size": number (suggested unit size, DEFAULT 1000),
  "entry": number (current market price),
  "tp": number (Take Profit level),
  "sl": number (Stop Loss level),
  "confidence": number (0-100),
  "primary_reason": "One concise sentence explanation."
}

Do not include conversational text or markdown blocks.`;
  }

  /**
   * Prompt 2: Active Trade Analysis Logic (Risk Manager)
   */
  private getActiveAnalysisPrompt(): string {
    return `You are an institutional Forex Risk Manager monitoring an ACTIVE trade. 
Analyze the provided market context AND the active trade details (Entry, Current Price, SL, TP).

YOUR RULES:
1. If the trade is in deep profit, aggressively trail the Stop Loss to lock in gains.
2. If the fundamental context has reversed (e.g., bad news just dropped), recommend closing the trade early.
3. If the trade is still valid and levels are sound, recommend 'STAY'.

Return ONLY a strictly valid JSON object with the following schema:
{ 
  "action": "MODIFY_SL_TP" | "CLOSE_NOW" | "STAY", 
  "new_sl": number (required if MODIFY_SL_TP), 
  "new_tp": number (required if MODIFY_SL_TP), 
  "reason": "Brief technical explanation" 
}`;
  }

  async generateSuggestion(context: CompiledContext): Promise<TradeSuggestion> {
    try {
      const prompt = `
${this.getSuggestionPrompt()}

Market Context:
${JSON.stringify(context, null, 2)}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const cleanText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanText) as TradeSuggestion;
    } catch (error) {
      console.error("AI Suggestion Error:", error);
      return {
        action: "HOLD",
        size: 0,
        entry: 0,
        tp: 0,
        sl: 0,
        confidence: 0,
        primary_reason: "AI failed to generate a suggestion.",
      };
    }
  }

  async analyzeActiveTrade(
    context: any,
    tradeData: any,
  ): Promise<ActiveAnalysis> {
    try {
      const prompt = `
${this.getActiveAnalysisPrompt()}

Market Context:
${JSON.stringify(context, null, 2)}

Active Trade Details:
${JSON.stringify(tradeData, null, 2)}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const cleanText = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanText);

      return {
        recommendation: parsed.action,
        new_sl: parsed.new_sl,
        new_tp: parsed.new_tp,
        reasoning: parsed.reason,
      };
    } catch (error) {
      console.error("AI Active Analysis Error:", error);
      return {
        recommendation: "STAY",
        reasoning:
          "AI failed to analyze the active trade due to a system error.",
      };
    }
  }
}

export const orbitAI = new OrbitAIService();
