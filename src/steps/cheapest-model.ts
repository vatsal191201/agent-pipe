import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getApiKey } from "../runtime/config.js";
import type { PipeConfig } from "../runtime/config.js";

export function resolveCheapestModel(globalConfig: PipeConfig): { model: any; modelId: string } {
  const anthropicKey = getApiKey("anthropic", globalConfig);
  if (anthropicKey) {
    return { model: createAnthropic({ apiKey: anthropicKey })("claude-haiku-4-5"), modelId: "claude-haiku-4-5" };
  }

  const openaiKey = getApiKey("openai", globalConfig);
  if (openaiKey) {
    return { model: createOpenAI({ apiKey: openaiKey })("gpt-4.1-mini"), modelId: "gpt-4.1-mini" };
  }

  const googleKey = getApiKey("google", globalConfig);
  if (googleKey) {
    return { model: createGoogleGenerativeAI({ apiKey: googleKey })("gemini-2.5-flash"), modelId: "gemini-2.5-flash" };
  }

  // Ollama — no key required, try as last resort
  try {
    return { model: createOpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama" })("llama3.2"), modelId: "llama3.2 (local)" };
  } catch {
    throw new Error(
      "No API key found for any provider. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or run Ollama locally."
    );
  }
}

export function parseMaxTokens(raw: string | undefined, fallback = 4096): number {
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid max-tokens value: "${raw}". Must be a positive number.`);
  }
  return parsed;
}
