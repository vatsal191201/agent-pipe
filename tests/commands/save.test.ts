import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { savePipeline, loadPipeline, listPipelines } from "../../src/commands/save.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("pipeline save/load", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("saves and loads a pipeline definition", () => {
    savePipeline("review", "pipe claude --config system='Review this code'", tempDir);
    const pipeline = loadPipeline("review", tempDir);
    expect(pipeline).toBeDefined();
    expect(pipeline!.name).toBe("review");
    expect(pipeline!.definition).toContain("pipe claude");
  });

  it("returns undefined for unknown pipeline", () => {
    expect(loadPipeline("nonexistent", tempDir)).toBeUndefined();
  });

  it("lists saved pipelines", () => {
    savePipeline("review", "pipe claude", tempDir);
    savePipeline("test", "pipe openai", tempDir);
    const names = listPipelines(tempDir);
    expect(names).toContain("review");
    expect(names).toContain("test");
  });
});
