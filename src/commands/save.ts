import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Pipeline {
  name: string;
  definition: string;
  created: string;
}

function pipelinesDir(baseDir?: string): string {
  const dir = baseDir || join(homedir(), ".pipe", "pipelines");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function savePipeline(name: string, definition: string, baseDir?: string): void {
  const dir = pipelinesDir(baseDir);
  const pipeline: Pipeline = { name, definition, created: new Date().toISOString() };
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(pipeline, null, 2) + "\n");
}

export function loadPipeline(name: string, baseDir?: string): Pipeline | undefined {
  const dir = pipelinesDir(baseDir);
  const path = join(dir, `${name}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function listPipelines(baseDir?: string): string[] {
  const dir = pipelinesDir(baseDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

export function saveCommand(name: string, definition: string): void {
  savePipeline(name, definition);
  console.log(`Pipeline '${name}' saved.`);
  console.log(`Run it with: pipe run ${name}`);
}
