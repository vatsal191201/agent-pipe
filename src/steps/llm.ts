import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";
import { parseMaxTokens } from "./cheapest-model.js";

export function resolveModel(modelString: string, globalConfig: any) {
  // Parse "provider/model" format
  const slashIndex = modelString.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(
      `Invalid model format: "${modelString}". Use provider/model format (e.g., anthropic/claude-sonnet-4-6, openai/gpt-4.1, google/gemini-2.5-flash, ollama/llama3.2).`
    );
  }

  const provider = modelString.slice(0, slashIndex);
  const modelId = modelString.slice(slashIndex + 1);

  switch (provider) {
    case "anthropic": {
      const apiKey = getApiKey("anthropic", globalConfig);
      if (!apiKey) throw new Error("No Anthropic API key. Set ANTHROPIC_API_KEY.");
      return { model: createAnthropic({ apiKey })(modelId), provider, modelId };
    }
    case "openai": {
      const apiKey = getApiKey("openai", globalConfig);
      if (!apiKey) throw new Error("No OpenAI API key. Set OPENAI_API_KEY.");
      return { model: createOpenAI({ apiKey })(modelId), provider, modelId };
    }
    case "google": {
      const apiKey = getApiKey("google", globalConfig);
      if (!apiKey) throw new Error("No Google API key. Set GOOGLE_GENERATIVE_AI_API_KEY.");
      return { model: createGoogleGenerativeAI({ apiKey })(modelId), provider, modelId };
    }
    case "ollama":
    case "local": {
      return {
        model: createOpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama" })(modelId),
        provider: "ollama",
        modelId,
      };
    }
    default:
      throw new Error(
        `Unknown provider: "${provider}". Supported: anthropic, openai, google, ollama.`
      );
  }
}

export const llmStep: StepDefinition = {
  name: "llm",
  description: "Universal LLM step — route to any provider/model",
  configSchema: {
    model: { type: "string", description: "Provider/model (e.g., anthropic/claude-sonnet-4-6, openai/gpt-4.1)" },
    system: { type: "string", description: "System prompt" },
    "max-tokens": { type: "string", default: "4096", description: "Maximum output tokens" },
  },
  run: async function* (ctx: StepContext) {
    const modelString = ctx.config.model || ctx.globalConfig.default_model;
    if (!modelString) {
      throw new Error("No model specified. Use: pipe llm -c model=provider/model-name");
    }

    const { model, provider, modelId } = resolveModel(modelString, ctx.globalConfig);
    const startTime = Date.now();

    const result = await streamText({
      model,
      prompt: ctx.input,
      ...(ctx.config.system ? { system: ctx.config.system } : {}),
      maxOutputTokens: parseMaxTokens(ctx.config["max-tokens"]),
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "llm",
      provider,
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
