import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uninstallStep } from "../../src/commands/uninstall.js";

describe("uninstall command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-uninstall-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("removes an installed step", () => {
    const stepDir = join(tempDir, "my-step");
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(join(stepDir, "pipe.json"), JSON.stringify({ name: "my-step" }));
    writeFileSync(join(stepDir, "index.js"), "export default {};");

    expect(existsSync(stepDir)).toBe(true);

    uninstallStep("my-step", tempDir);

    expect(existsSync(stepDir)).toBe(false);
  });

  it("errors when step is not installed", () => {
    const origExit = process.exit;
    const origError = console.error;
    let exitCode: number | undefined;

    console.error = () => {};
    process.exit = ((code: number) => {
      exitCode = code;
      throw new Error("process.exit called");
    }) as any;

    expect(() => uninstallStep("nonexistent", tempDir)).toThrow("process.exit called");

    console.error = origError;
    process.exit = origExit;

    expect(exitCode).toBe(1);
  });
});
