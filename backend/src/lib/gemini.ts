import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing from environment variables.");
}

export const genAI = new GoogleGenerativeAI(apiKey);

export const getGeminiModel = (modelName: string = "gemini-flash-latest") => {
  return genAI.getGenerativeModel({ model: modelName });
};
