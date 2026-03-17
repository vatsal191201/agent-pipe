import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export function uninstallStep(name: string, baseDir?: string): void {
  const stepsPath = baseDir || join(homedir(), ".pipe", "steps");
  const stepDir = join(stepsPath, name);
  if (!existsSync(stepDir)) {
    console.error(`Step "${name}" is not installed.`);
    process.exit(1);
  }
  rmSync(stepDir, { recursive: true, force: true });
  console.log(`Uninstalled step "${name}".`);
}

export function uninstallCommand(name: string): void {
  uninstallStep(name);
}
