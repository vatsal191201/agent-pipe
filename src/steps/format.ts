import type { StepDefinition } from "./types.js";

export const formatStep: StepDefinition = {
  name: "format",
  description: "Format input into a specified format (md, json, csv, yaml)",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "format" };
  },
};
