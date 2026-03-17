import { loadConfig, saveConfig, defaultConfigPath } from "../runtime/config.js";
import type { PipeConfig } from "../runtime/config.js";

/**
 * Resolve a dot-notation path to get a value from a nested object.
 */
export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Set a value at a dot-notation path in a nested object.
 * Creates intermediate objects as needed.
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Flatten a nested object into dot-notation key-value pairs.
 */
export function flattenConfig(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenConfig(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

/**
 * Mask a value if its key looks like an API key.
 * Shows the first 7 characters followed by "****".
 */
export function maskValue(key: string, value: string): string {
  if (key.includes("api_key") || key.includes("api_keys")) {
    if (value.length > 7) {
      return value.slice(0, 7) + "****";
    }
    return "****";
  }
  return value;
}

/**
 * Parse a string value, converting "true"/"false" to booleans
 * and numeric strings to numbers where appropriate.
 */
function parseValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export function configSet(key: string, value: string, configPath?: string): void {
  const path = configPath ?? defaultConfigPath();
  const config = loadConfig(path);
  setByPath(config as unknown as Record<string, unknown>, key, parseValue(value));
  saveConfig(config, path);
}

export function configGet(key: string, configPath?: string): string {
  const path = configPath ?? defaultConfigPath();
  const config = loadConfig(path);
  const value = getByPath(config as unknown as Record<string, unknown>, key);
  if (value === undefined) {
    return `Key "${key}" is not set.`;
  }
  return String(value);
}

export function configList(configPath?: string): string {
  const path = configPath ?? defaultConfigPath();
  const config = loadConfig(path);
  const flat = flattenConfig(config as unknown as Record<string, unknown>);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(flat)) {
    lines.push(`${key}: ${maskValue(key, value)}`);
  }
  return lines.join("\n");
}

export function configSetCommand(key: string, value: string): void {
  configSet(key, value);
  console.log(`Set ${key} = ${value}`);
}

export function configGetCommand(key: string): void {
  console.log(configGet(key));
}

export function configListCommand(): void {
  console.log(configList());
}
