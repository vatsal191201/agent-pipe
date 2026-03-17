import { existsSync, cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

function stepsDir(baseDir?: string): string {
  const dir = baseDir || join(homedir(), ".pipe", "steps");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function validateStep(dir: string): { name: string } {
  const manifestPath = join(dir, "pipe.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`No pipe.json found in ${dir}. Not a valid pipe step.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (!manifest.name) {
    throw new Error(`pipe.json missing "name" field in ${dir}.`);
  }
  const mainFile = manifest.main || "index.js";
  if (!existsSync(join(dir, mainFile))) {
    throw new Error(`Main file "${mainFile}" not found in ${dir}.`);
  }
  return { name: manifest.name };
}

export function installFromLocal(source: string, baseDir?: string): void {
  const absSource = resolve(source);
  if (!existsSync(absSource)) {
    throw new Error(`Path not found: ${absSource}`);
  }
  const { name } = validateStep(absSource);
  const dest = join(stepsDir(baseDir), name);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  cpSync(absSource, dest, { recursive: true });
  console.log(`Installed step "${name}" to ~/.pipe/steps/${name}/`);
}

export function installFromGit(url: string, baseDir?: string): void {
  const tempDir = join(tmpdir(), `pipe-install-${Date.now()}`);
  try {
    execFileSync("git", ["clone", "--depth", "1", url, tempDir], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const { name } = validateStep(tempDir);
    const dest = join(stepsDir(baseDir), name);
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
    }
    // Remove .git directory before copying
    const gitDir = join(tempDir, ".git");
    if (existsSync(gitDir)) {
      rmSync(gitDir, { recursive: true, force: true });
    }
    cpSync(tempDir, dest, { recursive: true });
    console.log(`Installed step "${name}" from ${url}`);
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

export function isGitUrl(source: string): boolean {
  return source.startsWith("https://") || source.startsWith("git@") || source.endsWith(".git");
}

export function isLocalPath(source: string): boolean {
  return source.startsWith("./") || source.startsWith("/") || source.startsWith("../");
}

export function installCommand(source: string): void {
  if (isLocalPath(source)) {
    installFromLocal(source);
  } else if (isGitUrl(source)) {
    installFromGit(source);
  } else {
    // Assume npm package name -- future feature
    console.log(`npm registry install coming soon.`);
    console.log(`For now, use a git URL or local path:`);
    console.log(`  pipe install https://github.com/user/pipe-step-${source}.git`);
    console.log(`  pipe install ./path/to/${source}`);
  }
}
