import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { readStdin } from "../../src/runtime/stdin.js";

describe("readStdin", () => {
  it("reads all data from a readable stream", async () => {
    const stream = Readable.from(["hello ", "world"]);
    const result = await readStdin(stream);
    expect(result).toBe("hello world");
  });

  it("returns empty string for empty stream", async () => {
    const stream = Readable.from([]);
    const result = await readStdin(stream);
    expect(result).toBe("");
  });

  it("handles multi-line input", async () => {
    const stream = Readable.from(["line1\n", "line2\n", "line3"]);
    const result = await readStdin(stream);
    expect(result).toBe("line1\nline2\nline3");
  });
});
