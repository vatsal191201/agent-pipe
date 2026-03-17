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

import { squeezeStep } from "../../src/steps/squeeze.js";
import { streamText } from "ai";

function makeMockStream(...chunks: string[]) {
  return (async function* () {
    for (const c of chunks) yield c;
  })();
}

function makeMockResult(chunks: string[], inputTokens = 100, outputTokens = 50) {
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

describe("squeeze step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams compressed text", async () => {
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult(["Compressed", " text"], 100, 20)
    );

    const ctx: StepContext = {
      input: "This is a very long text with lots of redundancy and filler content that repeats itself multiple times over and over again",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const { chunks, meta } = await drainGenerator(squeezeStep.run(ctx));

    expect(chunks.join("")).toBe("Compressed text");
    expect(meta).toMatchObject({ step: "squeeze" });
    expect(streamText).toHaveBeenCalledOnce();
  });

  it("uses medium ratio prompt by default", async () => {
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult(["output"], 50, 25)
    );

    const ctx: StepContext = {
      input: "Some input text",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    await drainGenerator(squeezeStep.run(ctx));

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("50%"),
      })
    );
  });

  it("ratio=high uses 25% compression prompt", async () => {
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult(["short"], 100, 10)
    );

    const ctx: StepContext = {
      input: "Some long input text that should be heavily compressed",
      config: { ratio: "high" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    await drainGenerator(squeezeStep.run(ctx));

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("25%"),
      })
    );
  });

  it("ratio=low uses 75% compression prompt", async () => {
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult(["light compression"], 80, 60)
    );

    const ctx: StepContext = {
      input: "Some input text with minor redundancy",
      config: { ratio: "low" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    await drainGenerator(squeezeStep.run(ctx));

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("75%"),
      })
    );
  });

  it("preserve option is appended to system prompt", async () => {
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult(["preserved output"], 80, 40)
    );

    const ctx: StepContext = {
      input: "Meeting notes with action items and random chatter",
      config: { preserve: "action items and decisions" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    await drainGenerator(squeezeStep.run(ctx));

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("action items and decisions"),
      })
    );
  });

  it("metadata includes compression ratio", async () => {
    // Input is 50 chars, output "short" is 5 chars => 90% reduction
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult(["short"], 100, 10)
    );

    const ctx: StepContext = {
      input: "A".repeat(50),
      config: { ratio: "high" },
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const { meta } = await drainGenerator(squeezeStep.run(ctx));

    expect(meta.step).toBe("squeeze");
    expect(meta.compression).toContain("→");
    expect(meta.compression).toContain("reduction");
    expect(meta.compression).toContain("50");  // input length
    expect(meta.compression).toContain("5");   // output length
    expect(meta.tokens).toEqual({ input: 100, output: 10 });
    expect(typeof meta.latency_ms).toBe("number");
  });

  it("returns model id in metadata", async () => {
    vi.mocked(streamText).mockResolvedValue(
      makeMockResult(["ok"], 10, 5)
    );

    const ctx: StepContext = {
      input: "test",
      config: {},
      globalConfig: {
        default_model: "",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const { meta } = await drainGenerator(squeezeStep.run(ctx));
    expect(meta.model).toBeDefined();
    expect(typeof meta.model).toBe("string");
  });
});
