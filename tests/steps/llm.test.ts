import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StepContext } from "../../src/steps/types.js";

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

import { llmStep } from "../../src/steps/llm.js";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

function makeMockStream(...chunks: string[]) {
  return (async function* () {
    for (const c of chunks) yield c;
  })();
}

function makeMockResult(chunks: string[], inputTokens = 10, outputTokens = 20) {
  return {
    textStream: makeMockStream(...chunks),
    usage: Promise.resolve({ inputTokens, outputTokens }),
  } as any;
}

async function drainGenerator(gen: AsyncGenerator<string, any, unknown>) {
  const chunks: string[] = [];
  let meta;
  while (true) {
    const { value, done } = await gen.next();
    if (done) {
      meta = value;
      break;
    }
    chunks.push(value);
  }
  return { chunks, meta };
}

describe("llm step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes to Anthropic when model starts with anthropic/", async () => {
    vi.mocked(streamText).mockResolvedValue(makeMockResult(["Hello", " Anthropic"]));

    const ctx: StepContext = {
      input: "Say hello",
      config: { model: "anthropic/claude-haiku-4-5" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test-anthropic" },
        telemetry: false,
      },
    };

    const { chunks, meta } = await drainGenerator(llmStep.run(ctx));

    expect(chunks.join("")).toBe("Hello Anthropic");
    expect(createAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-test-anthropic" })
    );
    expect(meta).toMatchObject({
      step: "llm",
      provider: "anthropic",
      model: "claude-haiku-4-5",
    });
  });

  it("routes to OpenAI when model starts with openai/", async () => {
    vi.mocked(streamText).mockResolvedValue(makeMockResult(["Hello", " OpenAI"]));

    const ctx: StepContext = {
      input: "Say hello",
      config: { model: "openai/gpt-4.1-mini" },
      globalConfig: {
        default_model: "",
        api_keys: { openai: "sk-test-openai" },
        telemetry: false,
      },
    };

    const { chunks, meta } = await drainGenerator(llmStep.run(ctx));

    expect(chunks.join("")).toBe("Hello OpenAI");
    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-test-openai" })
    );
    expect(meta).toMatchObject({
      step: "llm",
      provider: "openai",
      model: "gpt-4.1-mini",
    });
  });

  it("routes to Ollama when model starts with ollama/", async () => {
    vi.mocked(streamText).mockResolvedValue(makeMockResult(["Hello", " Ollama"]));

    const ctx: StepContext = {
      input: "Say hello",
      config: { model: "ollama/llama3.2" },
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const { chunks, meta } = await drainGenerator(llmStep.run(ctx));

    expect(chunks.join("")).toBe("Hello Ollama");
    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:11434/v1",
        apiKey: "ollama",
      })
    );
    expect(meta).toMatchObject({
      step: "llm",
      provider: "ollama",
      model: "llama3.2",
    });
  });

  it("routes to Google when model starts with google/", async () => {
    vi.mocked(streamText).mockResolvedValue(makeMockResult(["Hello", " Google"]));

    const ctx: StepContext = {
      input: "Say hello",
      config: { model: "google/gemini-2.5-flash" },
      globalConfig: {
        default_model: "",
        api_keys: { google: "goog-test-key" },
        telemetry: false,
      },
    };

    const { chunks, meta } = await drainGenerator(llmStep.run(ctx));

    expect(chunks.join("")).toBe("Hello Google");
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "goog-test-key" })
    );
    expect(meta).toMatchObject({
      step: "llm",
      provider: "google",
      model: "gemini-2.5-flash",
    });
  });

  it("uses default_model from globalConfig when no model specified", async () => {
    vi.mocked(streamText).mockResolvedValue(makeMockResult(["default"]));

    const ctx: StepContext = {
      input: "test",
      config: {},
      globalConfig: {
        default_model: "anthropic/claude-sonnet-4-6",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const { meta } = await drainGenerator(llmStep.run(ctx));

    expect(meta).toMatchObject({
      step: "llm",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
  });

  it("throws clear error for invalid model format (no slash)", async () => {
    const ctx: StepContext = {
      input: "test",
      config: { model: "claude-haiku-4-5" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const gen = llmStep.run(ctx);
    await expect(gen.next()).rejects.toThrow("Invalid model format");
  });

  it("throws clear error for unknown provider", async () => {
    const ctx: StepContext = {
      input: "test",
      config: { model: "fakeprovider/some-model" },
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = llmStep.run(ctx);
    await expect(gen.next()).rejects.toThrow('Unknown provider: "fakeprovider"');
  });

  it("throws error when no model specified and no default", async () => {
    const ctx: StepContext = {
      input: "test",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = llmStep.run(ctx);
    await expect(gen.next()).rejects.toThrow("No model specified");
  });

  it("returns token usage and latency in metadata", async () => {
    vi.mocked(streamText).mockResolvedValue(makeMockResult(["ok"], 15, 25));

    const ctx: StepContext = {
      input: "test",
      config: { model: "anthropic/claude-haiku-4-5" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const { meta } = await drainGenerator(llmStep.run(ctx));

    expect(meta).toMatchObject({
      step: "llm",
      tokens: { input: 15, output: 25 },
    });
    expect(meta).toHaveProperty("latency_ms");
    expect(typeof meta.latency_ms).toBe("number");
  });

  it("passes system prompt when configured", async () => {
    vi.mocked(streamText).mockResolvedValue(makeMockResult(["response"]));

    const ctx: StepContext = {
      input: "test",
      config: { model: "openai/gpt-4.1-mini", system: "You are a pirate" },
      globalConfig: {
        default_model: "",
        api_keys: { openai: "sk-test" },
        telemetry: false,
      },
    };

    const gen = llmStep.run(ctx);
    while (true) {
      const { done } = await gen.next();
      if (done) break;
    }

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({ system: "You are a pirate" })
    );
  });
});
