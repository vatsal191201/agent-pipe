import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

export const extractStep: StepDefinition = {
  name: "extract",
  description: "Extract specific content from input text using an LLM",
  configSchema: {
    query: { type: "string", description: "What to extract from the text" },
  },
  run: async function* (ctx: StepContext) {
    const query = ctx.config.query;
    if (!query) {
      throw new Error("Missing required config: query. Usage: pipe extract -c query=\"email addresses\"");
    }

    const systemPrompt = `Extract the following from the text: ${query}. Output only the extracted content, nothing else.`;

    let model: any;
    let modelId: string;
    const anthropicKey = getApiKey("anthropic", ctx.globalConfig);
    const openaiKey = getApiKey("openai", ctx.globalConfig);

    if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      modelId = "claude-haiku-4-5";
      model = anthropic(modelId);
    } else if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      modelId = "gpt-4.1-mini";
      model = openai(modelId);
    } else {
      throw new Error("No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
    }

    const startTime = Date.now();
    const result = await streamText({ model, system: systemPrompt, prompt: ctx.input });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "extract",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
