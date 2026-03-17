import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

export const openaiStep: StepDefinition = {
  name: "openai",
  description: "Send input to OpenAI and stream the response",
  configSchema: {
    model: { type: "string", default: "gpt-4.1", description: "OpenAI model to use" },
    system: { type: "string", description: "System prompt" },
    "max-tokens": { type: "string", default: "4096", description: "Maximum output tokens" },
  },
  run: async function* (ctx: StepContext) {
    const apiKey = getApiKey("openai", ctx.globalConfig);
    if (!apiKey) {
      throw new Error("No OpenAI API key found. Set OPENAI_API_KEY.");
    }

    const openai = createOpenAI({ apiKey });
    const modelId = ctx.config.model || "gpt-4.1";
    const model = openai(modelId);
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
      step: "openai",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
