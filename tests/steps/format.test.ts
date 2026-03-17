import { describe, it, expect } from "vitest";
import { formatStep } from "../../src/steps/format.js";
import type { StepContext } from "../../src/steps/types.js";

describe("format step", () => {
  const baseCtx: Omit<StepContext, "config"> = {
    input: "Hello world\nThis is a test",
    globalConfig: { default_model: "", api_keys: {}, telemetry: false },
  };

  it("wraps text in JSON with format=json", async () => {
    const ctx = { ...baseCtx, config: { format: "json" } };
    const chunks: string[] = [];
    const gen = formatStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) break;
      chunks.push(value);
    }
    const output = chunks.join("");
    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toHaveProperty("content");
    expect(JSON.parse(output)).toHaveProperty("lines");
    expect(JSON.parse(output).lines).toHaveLength(2);
  });

  it("passes through text when no format specified", async () => {
    const ctx = { ...baseCtx, config: {} };
    const chunks: string[] = [];
    const gen = formatStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) break;
      chunks.push(value);
    }
    expect(chunks.join("")).toBe("Hello world\nThis is a test");
  });

  it("converts text to CSV with format=csv", async () => {
    const ctx = { ...baseCtx, config: { format: "csv" } };
    const chunks: string[] = [];
    const gen = formatStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) break;
      chunks.push(value);
    }
    const output = chunks.join("");
    expect(output).toContain('"Hello world"');
    expect(output).toContain('"This is a test"');
  });

  it("passes through text with format=md", async () => {
    const ctx = { ...baseCtx, config: { format: "md" } };
    const chunks: string[] = [];
    const gen = formatStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) break;
      chunks.push(value);
    }
    expect(chunks.join("")).toBe("Hello world\nThis is a test");
  });

  it("returns metadata with format info", async () => {
    const ctx = { ...baseCtx, config: { format: "json" } };
    const gen = formatStep.run(ctx);
    let meta;
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
    }
    expect(meta).toMatchObject({ step: "format", format: "json" });
  });

  it("escapes quotes in CSV output", async () => {
    const ctx: StepContext = {
      input: 'She said "hello"',
      config: { format: "csv" },
      globalConfig: { default_model: "", api_keys: {}, telemetry: false },
    };
    const chunks: string[] = [];
    const gen = formatStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) break;
      chunks.push(value);
    }
    expect(chunks.join("")).toContain('""hello""');
  });
});
