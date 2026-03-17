import { streamText } from "ai";
import type { StepDefinition, StepContext } from "./types.js";
import { resolveCheapestModel } from "./cheapest-model.js";

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

    const { model, modelId } = resolveCheapestModel(ctx.globalConfig);

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
