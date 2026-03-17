import type { PipeMeta } from "../runtime/meta.js";
import type { PipeConfig } from "../runtime/config.js";

export interface StepContext {
  input: string;
  config: Record<string, string>;
  globalConfig: PipeConfig;
}

export type StepFn = (ctx: StepContext) => AsyncGenerator<string, PipeMeta, unknown>;

export interface StepDefinition {
  name: string;
  description: string;
  configSchema?: Record<string, { type: string; default?: string; description?: string }>;
  run: StepFn;
}
