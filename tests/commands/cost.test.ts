import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/runtime/stdin.js", () => ({
  readStdin: vi.fn(),
  isTTY: vi.fn(() => false),
}));

import { costCommand } from "../../src/commands/cost.js";
import { readStdin } from "../../src/runtime/stdin.js";

describe("cost command", () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    console.log = vi.fn((...args: any[]) => {
      consoleOutput.push(args.join(" "));
    });
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("parses a single [pipe:meta] line", async () => {
    const meta = JSON.stringify({
      step: "openai",
      model: "gpt-4.1",
      tokens: { input: 10, output: 20 },
      latency_ms: 500,
    });
    vi.mocked(readStdin).mockResolvedValue(`[pipe:meta] ${meta}\n`);

    await costCommand();

    const output = consoleOutput.join("\n");
    expect(output).toContain("Pipeline Cost Summary");
    expect(output).toContain("openai");
    expect(output).toContain("gpt-4.1");
    expect(output).toContain("500ms");
    expect(output).toContain("$");
  });

  it("aggregates multiple [pipe:meta] lines", async () => {
    const meta1 = JSON.stringify({
      step: "openai",
      model: "gpt-4.1",
      tokens: { input: 10, output: 20 },
      latency_ms: 500,
    });
    const meta2 = JSON.stringify({
      step: "claude",
      model: "claude-sonnet-4-6",
      tokens: { input: 30, output: 40 },
      latency_ms: 800,
    });
    vi.mocked(readStdin).mockResolvedValue(
      `[pipe:meta] ${meta1}\n[pipe:meta] ${meta2}\n`
    );

    await costCommand();

    const output = consoleOutput.join("\n");
    expect(output).toContain("openai");
    expect(output).toContain("claude");
    expect(output).toContain("Total");
    // Total should aggregate: 10+30=40 input, 20+40=60 output
    expect(output).toContain("40");
    expect(output).toContain("60");
  });

  it("handles empty input with helpful message", async () => {
    vi.mocked(readStdin).mockResolvedValue("");

    await costCommand();

    const output = consoleOutput.join("\n");
    expect(output).toContain("No [pipe:meta] data found");
    expect(output).toContain("pipe cost");
  });

  it("handles input with no [pipe:meta] lines", async () => {
    vi.mocked(readStdin).mockResolvedValue(
      "just some random text\nno metadata here\n"
    );

    await costCommand();

    const output = consoleOutput.join("\n");
    expect(output).toContain("No [pipe:meta] data found");
  });

  it("handles malformed JSON lines gracefully", async () => {
    const validMeta = JSON.stringify({
      step: "openai",
      model: "gpt-4.1",
      tokens: { input: 10, output: 20 },
      latency_ms: 500,
    });
    vi.mocked(readStdin).mockResolvedValue(
      `[pipe:meta] ${validMeta}\n[pipe:meta] {invalid json}\n`
    );

    await costCommand();

    const output = consoleOutput.join("\n");
    // Should still show valid entry and not crash
    expect(output).toContain("Pipeline Cost Summary");
    expect(output).toContain("openai");
    expect(output).toContain("gpt-4.1");
  });

  it("uses default cost rates for unknown models", async () => {
    const meta = JSON.stringify({
      step: "llm",
      model: "some-unknown-model",
      tokens: { input: 100, output: 200 },
      latency_ms: 300,
    });
    vi.mocked(readStdin).mockResolvedValue(`[pipe:meta] ${meta}\n`);

    await costCommand();

    const output = consoleOutput.join("\n");
    expect(output).toContain("Pipeline Cost Summary");
    expect(output).toContain("some-unknown-model");
    expect(output).toContain("$");
  });

  it("computes costs using known model rates", async () => {
    // gpt-4.1-mini: input=$0.4/M, output=$1.6/M
    // 1000 input tokens = $0.0004, 2000 output tokens = $0.0032, total = $0.0036
    const meta = JSON.stringify({
      step: "openai",
      model: "gpt-4.1-mini",
      tokens: { input: 1000, output: 2000 },
      latency_ms: 200,
    });
    vi.mocked(readStdin).mockResolvedValue(`[pipe:meta] ${meta}\n`);

    await costCommand();

    const output = consoleOutput.join("\n");
    expect(output).toContain("$0.003600");
  });
});
