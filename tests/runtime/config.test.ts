import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig, getApiKey, type PipeConfig } from "../../src/runtime/config.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("config", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns default config when no file exists", () => {
    const config = loadConfig(join(tempDir, "config.json"));
    expect(config.default_model).toBe("anthropic/claude-sonnet-4.6");
    expect(config.api_keys).toEqual({});
  });

  it("loads existing config file", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(configPath, JSON.stringify({ default_model: "openai/gpt-5.4" }));
    const config = loadConfig(configPath);
    expect(config.default_model).toBe("openai/gpt-5.4");
  });

  it("saves config to file", () => {
    const configPath = join(tempDir, "config.json");
    const config: PipeConfig = {
      default_model: "openai/gpt-5.4",
      api_keys: { openai: "sk-test" },
      telemetry: false,
    };
    saveConfig(config, configPath);
    const loaded = loadConfig(configPath);
    expect(loaded.default_model).toBe("openai/gpt-5.4");
  });

  it("resolves API key from config", () => {
    const config: PipeConfig = {
      default_model: "anthropic/claude-sonnet-4.6",
      api_keys: { anthropic: "sk-ant-test" },
      telemetry: false,
    };
    expect(getApiKey("anthropic", config)).toBe("sk-ant-test");
  });

  it("resolves API key from environment variable", () => {
    process.env.ANTHROPIC_API_KEY = "sk-from-env";
    const config: PipeConfig = {
      default_model: "anthropic/claude-sonnet-4.6",
      api_keys: {},
      telemetry: false,
    };
    expect(getApiKey("anthropic", config)).toBe("sk-from-env");
    delete process.env.ANTHROPIC_API_KEY;
  });
});
