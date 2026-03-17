import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StepContext } from "../../src/steps/types.js";

vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => "mock-model")),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "mock-model")),
}));

import { translateStep } from "../../src/steps/translate.js";
import { streamText } from "ai";

describe("translate step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams translated text", async () => {
    const mockStream = (async function* () {
      yield "Hola";
      yield " mundo";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 8 }),
    } as any);

    const ctx: StepContext = {
      input: "Hello world",
      config: { lang: "es" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const chunks: string[] = [];
    let meta;
    const gen = translateStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
      chunks.push(value);
    }

    expect(chunks.join("")).toBe("Hola mundo");
    expect(meta).toMatchObject({ step: "translate" });
    expect(streamText).toHaveBeenCalledOnce();
  });

  it("includes target language in system prompt", async () => {
    const mockStream = (async function* () {
      yield "Bonjour";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 5 }),
    } as any);

    const ctx: StepContext = {
      input: "Hello",
      config: { lang: "fr" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const gen = translateStep.run(ctx);
    while (true) {
      const { done } = await gen.next();
      if (done) break;
    }

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "Translate the following text to fr. Output only the translation, nothing else.",
      })
    );
  });

  it("throws error when lang not provided", async () => {
    const ctx: StepContext = {
      input: "Hello",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const gen = translateStep.run(ctx);
    await expect(gen.next()).rejects.toThrow(
      "Missing required config: lang. Usage: pipe translate -c lang=es"
    );
  });

  it("falls back to local model when no API keys are set", async () => {
    // resolveCheapestModel falls back to Ollama when no keys are available.
    // Since createOpenAI is mocked, it will succeed and use the mock model.
    const mockStream = (async function* () {
      yield "Hola";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 5 }),
    } as any);

    const savedAnthropic = process.env.ANTHROPIC_API_KEY;
    const savedOpenai = process.env.OPENAI_API_KEY;
    const savedGoogle = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const ctx: StepContext = {
      input: "Hello",
      config: { lang: "es" },
      globalConfig: {
        default_model: "",
        api_keys: {},
        telemetry: false,
      },
    };

    const gen = translateStep.run(ctx);
    const { value, done } = await gen.next();
    expect(done).toBe(false);
    expect(value).toBe("Hola");

    // Restore env vars
    if (savedAnthropic) process.env.ANTHROPIC_API_KEY = savedAnthropic;
    if (savedOpenai) process.env.OPENAI_API_KEY = savedOpenai;
    if (savedGoogle) process.env.GOOGLE_GENERATIVE_AI_API_KEY = savedGoogle;
  });
});
