import type { StepDefinition } from "./types.js";

export const claudeStep: StepDefinition = {
  name: "claude",
  description: "Send input to Claude and stream the response",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "claude" };
  },
};
