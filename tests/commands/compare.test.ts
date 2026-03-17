import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => "mock-anthropic-model")),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "mock-openai-model")),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => "mock-google-model")),
}));

vi.mock("../../src/runtime/stdin.js", () => ({
  readStdin: vi.fn(),
  isTTY: vi.fn(() => false),
}));

vi.mock("../../src/runtime/config.js", () => ({
  loadConfig: vi.fn(() => ({
    default_model: "",
    api_keys: { openai: "sk-test-openai", anthropic: "sk-test-anthropic" },
    telemetry: false,
  })),
  getApiKey: vi.fn((provider: string) => {
    const keys: Record<string, string> = {
      openai: "sk-test-openai",
      anthropic: "sk-test-anthropic",
      google: "goog-test-key",
    };
    return keys[provider];
  }),
}));

import { compareCommand } from "../../src/commands/compare.js";
import { streamText } from "ai";
import { readStdin } from "../../src/runtime/stdin.js";

function makeMockResult(text: string, inputTokens = 10, outputTokens = 20) {
  return {
    text: Promise.resolve(text),
    usage: Promise.resolve({ inputTokens, outputTokens }),
  } as any;
}

describe("compare command", () => {
  let consoleOutput: string[];
  let stderrOutput: string[];
  const originalWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    stderrOutput = [];
    process.stdout.write = vi.fn((chunk: any) => {
      consoleOutput.push(String(chunk));
      return true;
    }) as any;
    process.stderr.write = vi.fn((chunk: any) => {
      stderrOutput.push(String(chunk));
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    process.stderr.write = originalStderrWrite;
  });

  it("calls streamText for each model in parallel", async () => {
    vi.mocked(readStdin).mockResolvedValue("Explain recursion");
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult("Recursion is calling yourself.", 12, 28)
    );

    await compareCommand(["openai/gpt-4.1-mini", "openai/gpt-4.1"], {});

    expect(streamText).toHaveBeenCalledTimes(2);
  });

  it("output includes model headers", async () => {
    vi.mocked(readStdin).mockResolvedValue("Write a haiku");
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult("A short haiku here", 8, 15)
    );

    await compareCommand(["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"], {});

    const output = consoleOutput.join("");
    expect(output).toContain("openai/gpt-4.1-mini");
    expect(output).toContain("anthropic/claude-haiku-4-5");
  });

  it("output includes summary table with token counts", async () => {
    vi.mocked(readStdin).mockResolvedValue("Hello");
    vi.mocked(streamText)
      .mockResolvedValueOnce(makeMockResult("Response A", 10, 20))
      .mockResolvedValueOnce(makeMockResult("Response B", 10, 30));

    await compareCommand(["openai/gpt-4.1-mini", "openai/gpt-4.1"], {});

    const output = consoleOutput.join("");
    expect(output).toContain("Summary");
    expect(output).toContain("Model");
    expect(output).toContain("Input");
    expect(output).toContain("Output");
    expect(output).toContain("Time");
  });

  it("handles model errors gracefully", async () => {
    vi.mocked(readStdin).mockResolvedValue("Hello");
    vi.mocked(streamText)
      .mockResolvedValueOnce(makeMockResult("Response A", 10, 20))
      .mockRejectedValueOnce(new Error("API error"));

    await compareCommand(["openai/gpt-4.1-mini", "openai/gpt-4.1"], {});

    const output = consoleOutput.join("");
    expect(output).toContain("openai/gpt-4.1-mini");
    expect(output).toContain("openai/gpt-4.1");
    expect(output).toContain("ERROR");
  });

  it("displays individual responses before the summary", async () => {
    vi.mocked(readStdin).mockResolvedValue("Hello");
    vi.mocked(streamText)
      .mockResolvedValueOnce(makeMockResult("First response", 5, 10))
      .mockResolvedValueOnce(makeMockResult("Second response", 5, 12));

    await compareCommand(["openai/gpt-4.1-mini", "openai/gpt-4.1"], {});

    const output = consoleOutput.join("");
    expect(output).toContain("First response");
    expect(output).toContain("Second response");
    // Summary comes after responses
    const firstResponseIdx = output.indexOf("First response");
    const summaryIdx = output.indexOf("Summary");
    expect(summaryIdx).toBeGreaterThan(firstResponseIdx);
  });
});
