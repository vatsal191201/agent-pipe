import type { StepDefinition } from "./types.js";

export const summarizeStep: StepDefinition = {
  name: "summarize",
  description: "Summarize the input text",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "summarize" };
  },
};
