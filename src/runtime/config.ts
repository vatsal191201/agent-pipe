import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface PipeConfig {
  default_model: string;
  api_keys: Record<string, string>;
  telemetry: boolean;
}

const DEFAULT_CONFIG: PipeConfig = {
  default_model: "anthropic/claude-sonnet-4.6",
  api_keys: {},
  telemetry: false,
};

const ENV_KEY_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export function defaultConfigPath(): string {
  return join(homedir(), ".pipe", "config.json");
}

export function loadConfig(path: string = defaultConfigPath()): PipeConfig {
  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(
  config: PipeConfig,
  path: string = defaultConfigPath()
): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}

export function getApiKey(
  provider: string,
  config: PipeConfig = loadConfig()
): string | undefined {
  if (config.api_keys[provider]) {
    return config.api_keys[provider];
  }
  const envVar = ENV_KEY_MAP[provider];
  if (envVar) {
    return process.env[envVar];
  }
  return process.env[`${provider.toUpperCase()}_API_KEY`];
}
