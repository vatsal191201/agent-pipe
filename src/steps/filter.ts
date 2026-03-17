import { streamText } from "ai";
import type { StepDefinition, StepContext } from "./types.js";
import { resolveCheapestModel } from "./cheapest-model.js";

export const filterStep: StepDefinition = {
  name: "filter",
  description: "AI-powered grep: filter lines matching a query",
  configSchema: {
    query: { type: "string", description: "What to filter for" },
    invert: { type: "string", description: "If true, keep non-matching lines" },
  },
  run: async function* (ctx: StepContext) {
    const query = ctx.config.query;
    if (!query) {
      throw new Error("Missing required config: query. Usage: pipe filter -c query=\"error messages\"");
    }

    const invert = ctx.config.invert === "true";
    const systemPrompt = invert
      ? `Filter the following lines. Keep only lines that do NOT match: ${query}. Output non-matching lines only, one per line. Do not add explanations.`
      : `Filter the following lines. Keep only lines that match: ${query}. Output matching lines only, one per line. Do not add explanations.`;

    const { model, modelId } = resolveCheapestModel(ctx.globalConfig);

    const startTime = Date.now();
    const result = await streamText({ model, system: systemPrompt, prompt: ctx.input });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "filter",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
