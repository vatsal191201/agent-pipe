import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  configSet,
  configGet,
  configList,
  getByPath,
  setByPath,
  flattenConfig,
  maskValue,
} from "../../src/commands/config-cmd.js";
import { saveConfig } from "../../src/runtime/config.js";
import type { PipeConfig } from "../../src/runtime/config.js";

describe("config command", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-config-cmd-test-"));
    configPath = join(tempDir, "config.json");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("getByPath", () => {
    it("gets a top-level key", () => {
      expect(getByPath({ foo: "bar" }, "foo")).toBe("bar");
    });

    it("gets a nested key", () => {
      expect(getByPath({ a: { b: { c: "deep" } } }, "a.b.c")).toBe("deep");
    });

    it("returns undefined for missing path", () => {
      expect(getByPath({ a: 1 }, "b.c")).toBeUndefined();
    });
  });

  describe("setByPath", () => {
    it("sets a top-level key", () => {
      const obj: Record<string, unknown> = {};
      setByPath(obj, "foo", "bar");
      expect(obj.foo).toBe("bar");
    });

    it("sets a nested key, creating intermediates", () => {
      const obj: Record<string, unknown> = {};
      setByPath(obj, "a.b.c", "deep");
      expect((obj as any).a.b.c).toBe("deep");
    });
  });

  describe("flattenConfig", () => {
    it("flattens a nested object", () => {
      const flat = flattenConfig({ a: { b: "1" }, c: "2" });
      expect(flat).toEqual({ "a.b": "1", c: "2" });
    });
  });

  describe("maskValue", () => {
    it("masks api key values", () => {
      expect(maskValue("api_keys.anthropic", "sk-ant-abcdef123456")).toBe("sk-ant-****");
    });

    it("does not mask non-key values", () => {
      expect(maskValue("default_model", "anthropic/claude-sonnet-4.6")).toBe(
        "anthropic/claude-sonnet-4.6"
      );
    });

    it("masks short api keys with just ****", () => {
      expect(maskValue("api_keys.test", "short")).toBe("****");
    });
  });

  describe("configSet / configGet", () => {
    it("sets and gets a top-level value", () => {
      configSet("default_model", "openai/gpt-5.4", configPath);
      expect(configGet("default_model", configPath)).toBe("openai/gpt-5.4");
    });

    it("sets and gets a nested value via dot-notation", () => {
      configSet("api_keys.anthropic", "sk-ant-test123", configPath);
      expect(configGet("api_keys.anthropic", configPath)).toBe("sk-ant-test123");
    });

    it("sets boolean values correctly", () => {
      configSet("telemetry", "true", configPath);
      expect(configGet("telemetry", configPath)).toBe("true");
    });

    it("returns not-set message for missing key", () => {
      expect(configGet("nonexistent.key", configPath)).toBe('Key "nonexistent.key" is not set.');
    });
  });

  describe("configList", () => {
    it("lists all config with masked API keys", () => {
      const config: PipeConfig = {
        default_model: "anthropic/claude-sonnet-4.6",
        api_keys: { anthropic: "sk-ant-abcdef123456", openai: "sk-openai-xyz789" },
        telemetry: false,
      };
      saveConfig(config, configPath);

      const output = configList(configPath);
      expect(output).toContain("default_model: anthropic/claude-sonnet-4.6");
      expect(output).toContain("api_keys.anthropic: sk-ant-****");
      expect(output).toContain("api_keys.openai: sk-open****");
      expect(output).toContain("telemetry: false");
      // Must NOT contain the full key
      expect(output).not.toContain("sk-ant-abcdef123456");
    });
  });
});
