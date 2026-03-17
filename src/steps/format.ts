import type { StepDefinition, StepContext } from "./types.js";

export const formatStep: StepDefinition = {
  name: "format",
  description: "Format input into a specified format (md, json, csv, yaml)",
  configSchema: {
    format: { type: "string", default: "passthrough", description: "Output format: md, json, csv, or passthrough" },
  },
  run: async function* (ctx: StepContext) {
    const fmt = ctx.config.format || "passthrough";

    switch (fmt) {
      case "json":
        yield JSON.stringify({ content: ctx.input, lines: ctx.input.split("\n") }, null, 2);
        break;
      case "csv": {
        const lines = ctx.input.split("\n");
        yield lines.map((line) => `"${line.replace(/"/g, '""')}"`).join("\n");
        break;
      }
      case "md":
      default:
        yield ctx.input;
    }

    return { step: "format", format: fmt };
  },
};
