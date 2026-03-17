import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initCommand } from "../../src/commands/init.js";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("init command", () => {
  let tempDir: string;
  let origCwd: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-init-test-"));
    origCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates directory with pipe.json, index.js, and README.md", () => {
    initCommand("my-step");

    expect(existsSync(join(tempDir, "my-step"))).toBe(true);
    expect(existsSync(join(tempDir, "my-step", "pipe.json"))).toBe(true);
    expect(existsSync(join(tempDir, "my-step", "index.js"))).toBe(true);
    expect(existsSync(join(tempDir, "my-step", "README.md"))).toBe(true);
  });

  it("pipe.json has correct name and structure", () => {
    initCommand("test-step");

    const manifest = JSON.parse(
      readFileSync(join(tempDir, "test-step", "pipe.json"), "utf-8")
    );
    expect(manifest.name).toBe("test-step");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.main).toBe("index.js");
    expect(manifest.engine).toBe("node");
    expect(manifest.configSchema).toEqual({});
  });

  it("index.js contains the step name and has a valid default export", async () => {
    initCommand("upper");

    const content = readFileSync(join(tempDir, "upper", "index.js"), "utf-8");
    expect(content).toContain('name: "upper"');
    expect(content).toContain("ctx.input.toUpperCase()");

    // Dynamic import to verify it's valid JS
    const { pathToFileURL } = await import("node:url");
    const mod = await import(pathToFileURL(join(tempDir, "upper", "index.js")).href);
    const stepDef = mod.default;

    expect(stepDef.name).toBe("upper");
    expect(typeof stepDef.run).toBe("function");

    // Verify it actually works as a generator
    const gen = stepDef.run({ input: "hello", config: {}, globalConfig: {} });
    const { value: output } = await gen.next();
    expect(output).toBe("HELLO");
  });

  it("README.md contains the step name", () => {
    initCommand("my-step");

    const readme = readFileSync(join(tempDir, "my-step", "README.md"), "utf-8");
    expect(readme).toContain("# my-step");
    expect(readme).toContain("pipe my-step");
  });

  it("errors when directory already exists", () => {
    initCommand("dup-step");
    expect(() => initCommand("dup-step")).toThrow("already exists");
  });
});
