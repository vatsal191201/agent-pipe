import { streamText } from "ai";
import type { StepDefinition, StepContext } from "./types.js";
import { resolveCheapestModel } from "./cheapest-model.js";

export const translateStep: StepDefinition = {
  name: "translate",
  description: "Translate input text to a target language",
  configSchema: {
    lang: { type: "string", description: "Target language code (e.g., es, fr, de)" },
  },
  run: async function* (ctx: StepContext) {
    const lang = ctx.config.lang;
    if (!lang) {
      throw new Error("Missing required config: lang. Usage: pipe translate -c lang=es");
    }

    const systemPrompt = `Translate the following text to ${lang}. Output only the translation, nothing else.`;

    const { model, modelId } = resolveCheapestModel(ctx.globalConfig);

    const startTime = Date.now();
    const result = await streamText({ model, system: systemPrompt, prompt: ctx.input });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "translate",
      model: modelId,
      tokens: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
      latency_ms: Date.now() - startTime,
    };
  },
};
