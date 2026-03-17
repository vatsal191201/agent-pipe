import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { registerStep } from "./registry.js";
import type { StepDefinition } from "./types.js";

export function stepsDir(): string {
  return join(homedir(), ".pipe", "steps");
}

export async function loadLocalSteps(dir?: string): Promise<void> {
  const stepsPath = dir || stepsDir();
  if (!existsSync(stepsPath)) return;

  const entries = readdirSync(stepsPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const stepDir = join(stepsPath, entry.name);
    const manifestPath = join(stepDir, "pipe.json");
    if (!existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      const mainFile = manifest.main || "index.js";
      const mainPath = join(stepDir, mainFile);

      if (!existsSync(mainPath)) {
        process.stderr.write(
          `Warning: step "${entry.name}" missing main file: ${mainFile}\n`
        );
        continue;
      }

      // Dynamic import of the step module
      const mod = await import(pathToFileURL(mainPath).href);
      const stepDef: StepDefinition = mod.default || mod;

      // Validate it has the required fields
      if (!stepDef.name || !stepDef.run || typeof stepDef.run !== "function") {
        process.stderr.write(
          `Warning: step "${entry.name}" has invalid exports (needs name and run)\n`
        );
        continue;
      }

      // Apply manifest metadata
      stepDef.description = stepDef.description || manifest.description || "";
      if (manifest.configSchema) {
        stepDef.configSchema = {
          ...manifest.configSchema,
          ...stepDef.configSchema,
        };
      }

      registerStep(stepDef);
    } catch (err: any) {
      process.stderr.write(
        `Warning: failed to load step "${entry.name}": ${err.message}\n`
      );
    }
  }
}
