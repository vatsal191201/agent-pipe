import { describe, it, expect, vi } from "vitest";
import { emitMeta, formatMeta } from "../../src/runtime/meta.js";

describe("formatMeta", () => {
  it("formats metadata as [pipe:meta] JSON line", () => {
    const meta = { step: "claude", model: "claude-sonnet-4.6", latency_ms: 500 };
    const result = formatMeta(meta);
    expect(result).toBe('[pipe:meta] {"step":"claude","model":"claude-sonnet-4.6","latency_ms":500}');
  });
});

describe("emitMeta", () => {
  it("writes formatted metadata to stderr", () => {
    const mockStderr = { write: vi.fn() };
    emitMeta({ step: "test" }, mockStderr as any);
    expect(mockStderr.write).toHaveBeenCalledWith(
      '[pipe:meta] {"step":"test"}\n'
    );
  });
});
