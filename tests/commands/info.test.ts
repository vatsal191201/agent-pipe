import { describe, it, expect } from "vitest";
import { formatStepInfo } from "../../src/commands/info.js";
import { registerStep } from "../../src/steps/registry.js";

describe("info command", () => {
  it("shows step info with configSchema", () => {
    const output = formatStepInfo("claude");
    expect(output).toContain("claude — Send input to Claude and stream the response");
    expect(output).toContain("Config options:");
    expect(output).toContain("model");
    expect(output).toContain("(string)");
    expect(output).toContain("Claude model to use");
    expect(output).toContain("[default: claude-sonnet-4-6]");
    expect(output).toContain("system");
    expect(output).toContain("System prompt");
    expect(output).toContain("max-tokens");
    expect(output).toContain("Maximum output tokens");
    expect(output).toContain("[default: 4096]");
  });

  it("shows format step info", () => {
    const output = formatStepInfo("format");
    expect(output).toContain("format — Format input into a specified format");
    expect(output).toContain("Config options:");
    expect(output).toContain("[default: passthrough]");
  });

  it("shows error for unknown step", () => {
    const output = formatStepInfo("nonexistent");
    expect(output).toContain('Unknown step: "nonexistent"');
    expect(output).toContain("pipe list");
  });

  it("shows 'no configurable options' for step without configSchema", () => {
    // Register a step with no configSchema for testing.
    registerStep({
      name: "test-no-config",
      description: "A test step with no config",
      run: async function* () {
        yield "test";
        return { step: "test-no-config" };
      },
    });
    const output = formatStepInfo("test-no-config");
    expect(output).toContain("test-no-config — A test step with no config");
    expect(output).toContain("No configurable options.");
  });
});
