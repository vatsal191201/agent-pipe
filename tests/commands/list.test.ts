import { describe, it, expect } from "vitest";
import { formatStepList } from "../../src/commands/list.js";

describe("list command", () => {
  it("formats step list with names and descriptions", () => {
    const output = formatStepList();
    expect(output).toContain("claude");
    expect(output).toContain("openai");
    expect(output).toContain("summarize");
    expect(output).toContain("format");
  });
});
