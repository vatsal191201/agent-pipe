import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

export const geminiStep: StepDefinition = {
  name: "gemini",
  description: "Send input to Google Gemini and stream the response",
  configSchema: {
    model: { type: "string", default: "gemini-2.5-flash", description: "Gemini model to use" },
    system: { type: "string", description: "System prompt" },
    "max-tokens": { type: "string", default: "4096", description: "Maximum output tokens" },
  },
  run: async function* (ctx: StepContext) {
    const apiKey = getApiKey("google", ctx.globalConfig);
    if (!apiKey) {
      throw new Error(
        "No Google API key found. Set GOOGLE_GENERATIVE_AI_API_KEY or run: pipe config set api_keys.google <key>"
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const modelId = ctx.config.model || "gemini-2.5-flash";
    const model = google(modelId);
    const startTime = Date.now();

    const result = await streamText({
      model,
      prompt: ctx.input,
      ...(ctx.config.system ? { system: ctx.config.system } : {}),
      maxOutputTokens: ctx.config["max-tokens"] ? parseInt(ctx.config["max-tokens"]) : 4096,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "gemini",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
