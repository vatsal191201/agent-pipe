import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We test the internal helpers by importing them
import {
  installFromLocal,
  installFromGit,
  isGitUrl,
  isLocalPath,
  validateStep,
} from "../../src/commands/install.js";

describe("install command", () => {
  let tempDir: string;
  let targetDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-install-test-"));
    targetDir = mkdtempSync(join(tmpdir(), "pipe-install-target-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    rmSync(targetDir, { recursive: true, force: true });
  });

  function createValidStep(dir: string, name: string): string {
    const stepDir = join(dir, name);
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(
      join(stepDir, "pipe.json"),
      JSON.stringify({ name, version: "1.0.0", main: "index.js" })
    );
    writeFileSync(
      join(stepDir, "index.js"),
      `export default { name: "${name}", run: async function* (ctx) { yield ctx.input; } };`
    );
    return stepDir;
  }

  describe("isGitUrl", () => {
    it("recognizes https URLs", () => {
      expect(isGitUrl("https://github.com/user/repo.git")).toBe(true);
      expect(isGitUrl("https://github.com/user/repo")).toBe(true);
    });

    it("recognizes git@ URLs", () => {
      expect(isGitUrl("git@github.com:user/repo.git")).toBe(true);
    });

    it("recognizes .git suffix", () => {
      expect(isGitUrl("anything.git")).toBe(true);
    });

    it("rejects plain names", () => {
      expect(isGitUrl("code-review")).toBe(false);
    });
  });

  describe("isLocalPath", () => {
    it("recognizes relative paths", () => {
      expect(isLocalPath("./my-step")).toBe(true);
      expect(isLocalPath("../my-step")).toBe(true);
    });

    it("recognizes absolute paths", () => {
      expect(isLocalPath("/absolute/path")).toBe(true);
    });

    it("rejects plain names", () => {
      expect(isLocalPath("code-review")).toBe(false);
    });
  });

  describe("validateStep", () => {
    it("returns name from valid step", () => {
      const stepDir = createValidStep(tempDir, "my-step");
      const result = validateStep(stepDir);
      expect(result.name).toBe("my-step");
    });

    it("throws when pipe.json is missing", () => {
      const stepDir = join(tempDir, "no-manifest");
      mkdirSync(stepDir);
      expect(() => validateStep(stepDir)).toThrow("No pipe.json found");
    });

    it("throws when name field is missing", () => {
      const stepDir = join(tempDir, "no-name");
      mkdirSync(stepDir);
      writeFileSync(join(stepDir, "pipe.json"), JSON.stringify({ version: "1.0.0" }));
      writeFileSync(join(stepDir, "index.js"), "export default {};");
      expect(() => validateStep(stepDir)).toThrow('missing "name"');
    });

    it("throws when main file is missing", () => {
      const stepDir = join(tempDir, "no-main");
      mkdirSync(stepDir);
      writeFileSync(
        join(stepDir, "pipe.json"),
        JSON.stringify({ name: "no-main", main: "index.js" })
      );
      expect(() => validateStep(stepDir)).toThrow('Main file "index.js" not found');
    });
  });

  describe("installFromLocal", () => {
    it("copies step to target directory", () => {
      const stepDir = createValidStep(tempDir, "local-step");
      installFromLocal(stepDir, targetDir);

      const dest = join(targetDir, "local-step");
      expect(existsSync(dest)).toBe(true);
      expect(existsSync(join(dest, "pipe.json"))).toBe(true);
      expect(existsSync(join(dest, "index.js"))).toBe(true);

      const manifest = JSON.parse(readFileSync(join(dest, "pipe.json"), "utf-8"));
      expect(manifest.name).toBe("local-step");
    });

    it("throws when source path does not exist", () => {
      expect(() => installFromLocal("/nonexistent/path", targetDir)).toThrow("Path not found");
    });

    it("throws when source has no pipe.json", () => {
      const badDir = join(tempDir, "bad-step");
      mkdirSync(badDir);
      expect(() => installFromLocal(badDir, targetDir)).toThrow("No pipe.json found");
    });

    it("overwrites existing installation", () => {
      const stepDir = createValidStep(tempDir, "overwrite-step");

      // First install
      installFromLocal(stepDir, targetDir);

      // Modify source
      writeFileSync(
        join(stepDir, "pipe.json"),
        JSON.stringify({ name: "overwrite-step", version: "2.0.0", main: "index.js" })
      );

      // Second install (overwrite)
      installFromLocal(stepDir, targetDir);

      const manifest = JSON.parse(
        readFileSync(join(targetDir, "overwrite-step", "pipe.json"), "utf-8")
      );
      expect(manifest.version).toBe("2.0.0");
    });
  });

  describe("installFromGit", () => {
    it("rejects invalid git URL gracefully", () => {
      expect(() =>
        installFromGit("https://github.com/nonexistent-user-abc123/nonexistent-repo-xyz.git", targetDir)
      ).toThrow();
    });
  });
});
