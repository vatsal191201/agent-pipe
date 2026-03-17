import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

const LENGTH_GUIDE: Record<string, string> = {
  short: "1-2 sentences",
  medium: "3-5 sentences",
  long: "1-2 paragraphs",
};

const STYLE_GUIDE: Record<string, string> = {
  bullets: "Use bullet points.",
  prose: "Write in prose.",
  technical: "Use technical language.",
};

export const summarizeStep: StepDefinition = {
  name: "summarize",
  description: "Summarize the input text using an LLM",
  configSchema: {
    length: { type: "string", default: "medium", description: "Summary length: short, medium, long" },
    style: { type: "string", default: "prose", description: "Style: bullets, prose, technical" },
  },
  run: async function* (ctx: StepContext) {
    const length = ctx.config.length || "medium";
    const style = ctx.config.style || "prose";

    const systemPrompt = `Summarize the following text in ${LENGTH_GUIDE[length] || LENGTH_GUIDE.medium}. ${STYLE_GUIDE[style] || STYLE_GUIDE.prose} Output only the summary, nothing else.`;

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
      step: "summarize",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
