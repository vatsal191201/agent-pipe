import { streamText } from "ai";
import type { StepDefinition, StepContext } from "./types.js";
import { resolveCheapestModel } from "./cheapest-model.js";

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

    const { model, modelId } = resolveCheapestModel(ctx.globalConfig);

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
