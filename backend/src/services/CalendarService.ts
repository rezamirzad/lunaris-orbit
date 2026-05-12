import axios from "axios";

export interface CalendarEvent {
  event: string;
  date: string;
  impact: "Low" | "Medium" | "High";
  forecast: string | null;
  actual: string | null;
  currency: string;
  unit: string | null;
}

export class CalendarService {
  private readonly apiKey: string;
  private readonly baseUrl: string = "https://financialmodelingprep.com/api/v3";

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || "";
    if (!this.apiKey) {
      console.warn("FMP_API_KEY is missing from environment variables. Economic Calendar will not function.");
    }
  }

  async getEconomicCalendar(from?: string, to?: string, impacts: string[] = [], currencies: string[] = []): Promise<CalendarEvent[]> {
    if (!this.apiKey) return [];

    try {
      const startDate = from || new Date().toISOString().split('T')[0];
      const endDate = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await axios.get(`${this.baseUrl}/economic_calendar`, {
        params: {
          from: startDate,
          to: endDate,
          apikey: this.apiKey
        }
      });

      let events = (response.data || []).map((event: any) => {
        const actual = parseFloat(event.actual);
        const forecast = parseFloat(event.estimate);
        const delta = !isNaN(actual) && !isNaN(forecast) ? Number((actual - forecast).toFixed(4)) : null;

        return {
          event: event.event,
          date: event.date, 
          impact: event.impact || "Low",
          forecast: event.estimate || null,
          actual: event.actual || null,
          currency: event.currency,
          unit: event.unit || null,
          delta: delta // Bob: Tracking actual vs forecast for sentiment
        };
      });

      if (impacts.length > 0) {
        events = events.filter((e: any) => impacts.includes(e.impact));
      }

      if (currencies.length > 0) {
        // Bob: Filter for pair-relevant currencies (e.g., EUR or USD)
        events = events.filter((e: any) => currencies.includes(e.currency));
      }

      return events;
    } catch (error: any) {
      console.error("Error fetching Economic Calendar:", error.message);
      return [];
    }
  }
}

export const calendarService = new CalendarService();
