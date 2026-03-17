import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StepContext } from "../../src/steps/types.js";

vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "mock-ollama-model")),
}));

import { localStep } from "../../src/steps/local.js";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

describe("local step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams text from Ollama via OpenAI-compatible API", async () => {
    const mockStream = (async function* () {
      yield "Hello";
      yield " from";
      yield " Ollama";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    } as any);

    const ctx: StepContext = {
      input: "Say hello",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const chunks: string[] = [];
    let meta;
    const gen = localStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
      chunks.push(value);
    }

    expect(chunks.join("")).toBe("Hello from Ollama");
    expect(meta).toMatchObject({ step: "local" });
    expect(streamText).toHaveBeenCalledOnce();
  });

  it("sets baseURL to default Ollama endpoint", async () => {
    const mockStream = (async function* () {
      yield "hi";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 5 }),
    } as any);

    const ctx: StepContext = {
      input: "test",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = localStep.run(ctx);
    while (true) {
      const { done } = await gen.next();
      if (done) break;
    }

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:11434/v1",
        apiKey: "ollama",
      })
    );
  });

  it("uses custom URL when provided", async () => {
    const mockStream = (async function* () {
      yield "hi";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 5 }),
    } as any);

    const ctx: StepContext = {
      input: "test",
      config: { url: "http://myserver:11434/v1" },
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = localStep.run(ctx);
    while (true) {
      const { done } = await gen.next();
      if (done) break;
    }

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://myserver:11434/v1",
      })
    );
  });

  it("shows helpful error when connection refused", async () => {
    const error = new Error("fetch failed");
    (error as any).cause = { code: "ECONNREFUSED" };
    vi.mocked(streamText).mockRejectedValue(error);

    const ctx: StepContext = {
      input: "test",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = localStep.run(ctx);
    await expect(gen.next()).rejects.toThrow(
      "Ollama not running. Install from https://ollama.com and run: ollama serve"
    );
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
      config: { model: "mistral" },
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = localStep.run(ctx);
    let meta;
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
    }

    expect(meta).toMatchObject({ step: "local", model: "mistral" });
  });
});
