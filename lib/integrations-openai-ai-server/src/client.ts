import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  throw new Error("Missing OpenRouter base URL");
}

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error("Missing OpenRouter API key");
}

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,

  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5174",
    "X-Title": "Leafline AI Assistant",
  },
});