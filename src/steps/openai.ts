import type { StepDefinition } from "./types.js";

export const openaiStep: StepDefinition = {
  name: "openai",
  description: "Send input to OpenAI and stream the response",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "openai" };
  },
};
