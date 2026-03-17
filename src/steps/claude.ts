import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

export const claudeStep: StepDefinition = {
  name: "claude",
  description: "Send input to Claude and stream the response",
  configSchema: {
    model: { type: "string", default: "claude-sonnet-4-6", description: "Claude model to use" },
    system: { type: "string", description: "System prompt" },
    "max-tokens": { type: "string", default: "4096", description: "Maximum output tokens" },
  },
  run: async function* (ctx: StepContext) {
    const apiKey = getApiKey("anthropic", ctx.globalConfig);
    if (!apiKey) {
      throw new Error(
        "No Anthropic API key found. Set ANTHROPIC_API_KEY or run: pipe config set api_keys.anthropic <key>"
      );
    }

    const anthropic = createAnthropic({ apiKey });
    const modelId =
      ctx.config.model ||
      ctx.globalConfig.default_model?.replace("anthropic/", "") ||
      "claude-sonnet-4-6";
    const model = anthropic(modelId);
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
      step: "claude",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
