import { getStep } from "../steps/registry.js";

export function formatStepInfo(stepName: string): string {
  const step = getStep(stepName);
  if (!step) {
    return `Unknown step: "${stepName}". Run "pipe list" to see available steps.`;
  }

  const lines: string[] = [];
  lines.push(`${step.name} — ${step.description}`);

  if (!step.configSchema || Object.keys(step.configSchema).length === 0) {
    lines.push("");
    lines.push("No configurable options.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("Config options:");

  const entries = Object.entries(step.configSchema);
  const maxNameLen = Math.max(...entries.map(([name]) => name.length));

  for (const [name, schema] of entries) {
    const typePart = `(${schema.type})`;
    const descPart = schema.description ?? "";
    const defaultPart = schema.default !== undefined ? ` [default: ${schema.default}]` : "";
    lines.push(`  ${name.padEnd(maxNameLen + 2)}${typePart.padEnd(10)}${descPart}${defaultPart}`);
  }

  return lines.join("\n");
}

export function infoCommand(stepName: string): void {
  console.log(formatStepInfo(stepName));
}
