import type { StepDefinition } from "./types.js";

const steps = new Map<string, StepDefinition>();

export function registerStep(step: StepDefinition): void {
  steps.set(step.name, step);
}

export function getStep(name: string): StepDefinition | undefined {
  return steps.get(name);
}

export function listSteps(): string[] {
  return Array.from(steps.keys()).sort();
}

export function hasStep(name: string): boolean {
  return steps.has(name);
}

import { claudeStep } from "./claude.js";
import { openaiStep } from "./openai.js";
import { summarizeStep } from "./summarize.js";
import { formatStep } from "./format.js";
import { localStep } from "./local.js";
import { geminiStep } from "./gemini.js";
import { translateStep } from "./translate.js";
import { extractStep } from "./extract.js";
import { filterStep } from "./filter.js";
import { llmStep } from "./llm.js";

registerStep(claudeStep);
registerStep(openaiStep);
registerStep(summarizeStep);
registerStep(formatStep);
registerStep(localStep);
registerStep(geminiStep);
registerStep(translateStep);
registerStep(extractStep);
registerStep(filterStep);
registerStep(llmStep);
