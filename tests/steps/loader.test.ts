import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadLocalSteps } from "../../src/steps/loader.js";
import { getStep, hasStep } from "../../src/steps/registry.js";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("local step loader", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-loader-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads a valid step from a directory", async () => {
    const stepDir = join(tempDir, "greet");
    mkdirSync(stepDir, { recursive: true });

    writeFileSync(
      join(stepDir, "pipe.json"),
      JSON.stringify({ name: "greet", main: "index.js", description: "Greet step" })
    );

    writeFileSync(
      join(stepDir, "index.js"),
      `export default {
        name: "greet",
        description: "Greet step",
        run: async function* (ctx) {
          yield "Hello, " + ctx.input;
          return { step: "greet" };
        },
      };`
    );

    await loadLocalSteps(tempDir);

    expect(hasStep("greet")).toBe(true);
    const step = getStep("greet");
    expect(step).toBeDefined();
    expect(step!.name).toBe("greet");
    expect(step!.description).toBe("Greet step");
  });

  it("skips directories without pipe.json", async () => {
    const stepDir = join(tempDir, "no-manifest");
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(join(stepDir, "index.js"), "export default {};");

    // Should not throw
    await loadLocalSteps(tempDir);
    expect(hasStep("no-manifest")).toBe(false);
  });

  it("warns for step with missing run function", async () => {
    const stepDir = join(tempDir, "bad-step");
    mkdirSync(stepDir, { recursive: true });

    writeFileSync(
      join(stepDir, "pipe.json"),
      JSON.stringify({ name: "bad-step", main: "index.js" })
    );

    writeFileSync(
      join(stepDir, "index.js"),
      `export default { name: "bad-step", description: "Missing run" };`
    );

    const warnings: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((msg: string | Uint8Array) => {
      if (typeof msg === "string") warnings.push(msg);
      return true;
    }) as typeof process.stderr.write;

    await loadLocalSteps(tempDir);

    process.stderr.write = origWrite;

    expect(hasStep("bad-step")).toBe(false);
    expect(warnings.some((w) => w.includes("invalid exports"))).toBe(true);
  });

  it("warns for step with missing main file", async () => {
    const stepDir = join(tempDir, "no-main");
    mkdirSync(stepDir, { recursive: true });

    writeFileSync(
      join(stepDir, "pipe.json"),
      JSON.stringify({ name: "no-main", main: "index.js" })
    );
    // No index.js created

    const warnings: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((msg: string | Uint8Array) => {
      if (typeof msg === "string") warnings.push(msg);
      return true;
    }) as typeof process.stderr.write;

    await loadLocalSteps(tempDir);

    process.stderr.write = origWrite;

    expect(hasStep("no-main")).toBe(false);
    expect(warnings.some((w) => w.includes("missing main file"))).toBe(true);
  });

  it("does not throw when steps directory does not exist", async () => {
    const nonexistent = join(tempDir, "nonexistent");
    // Should not throw
    await loadLocalSteps(nonexistent);
  });

  it("applies manifest configSchema to loaded step", async () => {
    const stepDir = join(tempDir, "with-config");
    mkdirSync(stepDir, { recursive: true });

    writeFileSync(
      join(stepDir, "pipe.json"),
      JSON.stringify({
        name: "with-config",
        main: "index.js",
        description: "Step with config",
        configSchema: { greeting: { type: "string", default: "hi", description: "The greeting" } },
      })
    );

    writeFileSync(
      join(stepDir, "index.js"),
      `export default {
        name: "with-config",
        description: "Step with config",
        run: async function* (ctx) {
          yield ctx.config.greeting || "hello";
          return {};
        },
      };`
    );

    await loadLocalSteps(tempDir);

    const step = getStep("with-config");
    expect(step).toBeDefined();
    expect(step!.configSchema).toBeDefined();
    expect(step!.configSchema!.greeting).toEqual({
      type: "string",
      default: "hi",
      description: "The greeting",
    });
  });
});
