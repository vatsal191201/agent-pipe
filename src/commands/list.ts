import { listSteps, getStep } from "../steps/registry.js";

export function formatStepList(): string {
  const steps = listSteps();
  const lines = steps.map((name) => {
    const step = getStep(name)!;
    return `  ${name.padEnd(15)} ${step.description}`;
  });
  return `Available steps:\n\n${lines.join("\n")}`;
}

export function listCommand(): void {
  console.log(formatStepList());
}
