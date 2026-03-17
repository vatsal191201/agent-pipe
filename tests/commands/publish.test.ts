import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publishCommand } from "../../src/commands/publish.js";

describe("publish command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-publish-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("prints sharing instructions for valid step", () => {
    writeFileSync(
      join(tempDir, "pipe.json"),
      JSON.stringify({ name: "my-step", version: "1.0.0" })
    );

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => logs.push(args.join(" "));

    publishCommand(tempDir);

    console.log = origLog;

    const output = logs.join("\n");
    expect(output).toContain("my-step");
    expect(output).toContain("v1.0.0");
    expect(output).toContain("Share options");
    expect(output).toContain("Git repository");
  });

  it("errors when no pipe.json exists", () => {
    const origExit = process.exit;
    const origError = console.error;
    const errors: string[] = [];
    let exitCode: number | undefined;

    console.error = (...args: any[]) => errors.push(args.join(" "));
    process.exit = ((code: number) => {
      exitCode = code;
      throw new Error("process.exit called");
    }) as any;

    expect(() => publishCommand(tempDir)).toThrow("process.exit called");

    console.error = origError;
    process.exit = origExit;

    expect(exitCode).toBe(1);
    expect(errors.join("\n")).toContain("No pipe.json found");
  });

  it("errors when pipe.json missing name or version", () => {
    writeFileSync(
      join(tempDir, "pipe.json"),
      JSON.stringify({ name: "test" }) // missing version
    );

    const origExit = process.exit;
    const origError = console.error;
    const errors: string[] = [];
    let exitCode: number | undefined;

    console.error = (...args: any[]) => errors.push(args.join(" "));
    process.exit = ((code: number) => {
      exitCode = code;
      throw new Error("process.exit called");
    }) as any;

    expect(() => publishCommand(tempDir)).toThrow("process.exit called");

    console.error = origError;
    process.exit = origExit;

    expect(exitCode).toBe(1);
    expect(errors.join("\n")).toContain("'name' and 'version'");
  });
});
