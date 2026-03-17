import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { StepDefinition, StepContext } from "./types.js";
import { parseMaxTokens } from "./cheapest-model.js";

export const localStep: StepDefinition = {
  name: "local",
  description: "Send input to a local Ollama model via OpenAI-compatible API",
  configSchema: {
    model: { type: "string", default: "llama3.2", description: "Ollama model to use" },
    url: { type: "string", default: "http://localhost:11434/v1", description: "Ollama API base URL" },
    system: { type: "string", description: "System prompt" },
    "max-tokens": { type: "string", default: "4096", description: "Maximum output tokens" },
  },
  run: async function* (ctx: StepContext) {
    const baseURL = ctx.config.url || "http://localhost:11434/v1";
    const openai = createOpenAI({ baseURL, apiKey: "ollama" });
    const modelId = ctx.config.model || "llama3.2";
    const model = openai(modelId);
    const startTime = Date.now();

    let result;
    try {
      result = await streamText({
        model,
        prompt: ctx.input,
        ...(ctx.config.system ? { system: ctx.config.system } : {}),
        maxOutputTokens: parseMaxTokens(ctx.config["max-tokens"]),
      });
    } catch (err: any) {
      if (err?.cause?.code === "ECONNREFUSED") {
        throw new Error(
          "Ollama not running. Install from https://ollama.com and run: ollama serve"
        );
      }
      throw err;
    }

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "local",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
