import { streamText } from "ai";
import type { StepDefinition, StepContext } from "./types.js";
import { resolveCheapestModel } from "./cheapest-model.js";

const RATIO_PROMPTS: Record<string, string> = {
  low: "Compress the following text to roughly 75% of its original length. Preserve all key information, facts, and structure. Remove only redundancy and filler.",
  medium:
    "Compress the following text to roughly 50% of its original length. Preserve key information, main arguments, and important details. Remove redundancy, examples where one suffices, and filler.",
  high: "Compress the following text to roughly 25% of its original length. Preserve only the most critical information, main conclusions, and essential facts. Be aggressive about removing detail.",
};

export const squeezeStep: StepDefinition = {
  name: "squeeze",
  description: "Compress long text to reduce downstream token costs",
  configSchema: {
    ratio: {
      type: "string",
      default: "medium",
      description: "Compression ratio: low (75%), medium (50%), high (25%)",
    },
    preserve: {
      type: "string",
      description:
        "What to preserve during compression (e.g., 'action items', 'code blocks')",
    },
  },
  run: async function* (ctx: StepContext) {
    const ratio = ctx.config.ratio || "medium";
    const preserve = ctx.config.preserve;

    let systemPrompt = RATIO_PROMPTS[ratio] || RATIO_PROMPTS.medium;
    if (preserve) {
      systemPrompt += ` Pay special attention to preserving: ${preserve}.`;
    }
    systemPrompt += " Output only the compressed text, nothing else.";

    const inputLength = ctx.input.length;
    const { model, modelId } = resolveCheapestModel(ctx.globalConfig);
    const startTime = Date.now();

    const result = await streamText({
      model,
      system: systemPrompt,
      prompt: ctx.input,
    });

    let outputLength = 0;
    for await (const chunk of result.textStream) {
      outputLength += chunk.length;
      yield chunk;
    }

    const usage = await result.usage;
    const compressionRatio =
      inputLength > 0
        ? ((1 - outputLength / inputLength) * 100).toFixed(0)
        : "0";

    return {
      step: "squeeze",
      model: modelId,
      compression: `${compressionRatio}% reduction (${inputLength} → ${outputLength} chars)`,
      tokens: {
        input: usage.inputTokens ?? 0,
        output: usage.outputTokens ?? 0,
      },
      latency_ms: Date.now() - startTime,
    };
  },
};
