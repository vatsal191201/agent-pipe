import { describe, it, expect } from "vitest";
import { getStep, listSteps, hasStep } from "../../src/steps/registry.js";

describe("step registry", () => {
  it("lists all built-in steps", () => {
    const steps = listSteps();
    expect(steps).toContain("claude");
    expect(steps).toContain("openai");
    expect(steps).toContain("summarize");
    expect(steps).toContain("format");
    expect(steps.length).toBeGreaterThanOrEqual(4);
  });

  it("returns a step by name", () => {
    const step = getStep("claude");
    expect(step).toBeDefined();
    expect(step!.name).toBe("claude");
    expect(step!.description).toBeTruthy();
    expect(typeof step!.run).toBe("function");
  });

  it("returns undefined for unknown step", () => {
    expect(getStep("nonexistent")).toBeUndefined();
  });

  it("checks if step exists", () => {
    expect(hasStep("claude")).toBe(true);
    expect(hasStep("nonexistent")).toBe(false);
  });
});
