import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StepContext } from "../../src/steps/types.js";

vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => "mock-model")),
}));

import { claudeStep } from "../../src/steps/claude.js";
import { streamText } from "ai";

describe("claude step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams text from Claude API", async () => {
    const mockStream = (async function* () {
      yield "Hello";
      yield " from";
      yield " Claude";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    } as any);

    const ctx: StepContext = {
      input: "Say hello",
      config: {},
      globalConfig: {
        default_model: "anthropic/claude-sonnet-4.6",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const chunks: string[] = [];
    let meta;
    const gen = claudeStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
      chunks.push(value);
    }

    expect(chunks.join("")).toBe("Hello from Claude");
    expect(meta).toMatchObject({ step: "claude" });
    expect(streamText).toHaveBeenCalledOnce();
  });

  it("throws when no API key is available", async () => {
    const ctx: StepContext = {
      input: "Say hello",
      config: {},
      globalConfig: {
        default_model: "anthropic/claude-sonnet-4.6",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = claudeStep.run(ctx);
    await expect(gen.next()).rejects.toThrow("No Anthropic API key found");
  });

  it("uses model from config when provided", async () => {
    const mockStream = (async function* () {
      yield "hi";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 5 }),
    } as any);

    const ctx: StepContext = {
      input: "test",
      config: { model: "claude-opus-4" },
      globalConfig: {
        default_model: "anthropic/claude-sonnet-4.6",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const gen = claudeStep.run(ctx);
    let meta;
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
    }

    expect(meta).toMatchObject({ step: "claude", model: "claude-opus-4" });
  });

  it("passes system prompt when configured", async () => {
    const mockStream = (async function* () {
      yield "response";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 5 }),
    } as any);

    const ctx: StepContext = {
      input: "test",
      config: { system: "You are a helpful assistant" },
      globalConfig: {
        default_model: "anthropic/claude-sonnet-4.6",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const gen = claudeStep.run(ctx);
    while (true) {
      const { done } = await gen.next();
      if (done) break;
    }

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({ system: "You are a helpful assistant" })
    );
  });

  it("returns token usage and latency in metadata", async () => {
    const mockStream = (async function* () {
      yield "ok";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 15, outputTokens: 25 }),
    } as any);

    const ctx: StepContext = {
      input: "test",
      config: {},
      globalConfig: {
        default_model: "anthropic/claude-sonnet-4.6",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const gen = claudeStep.run(ctx);
    let meta;
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
    }

    expect(meta).toMatchObject({
      step: "claude",
      tokens: { input: 15, output: 25 },
    });
    expect(meta).toHaveProperty("latency_ms");
    expect(typeof (meta as any).latency_ms).toBe("number");
  });
});
