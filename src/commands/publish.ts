import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

export function publishCommand(dir: string = "."): void {
  const absDir = resolve(dir);
  const manifestPath = join(absDir, "pipe.json");

  if (!existsSync(manifestPath)) {
    console.error("No pipe.json found in current directory.");
    console.error("Run 'pipe init <name>' to create a step first.");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (!manifest.name || !manifest.version) {
    console.error("pipe.json must have 'name' and 'version' fields.");
    process.exit(1);
  }

  console.log(`Step "${manifest.name}" v${manifest.version} is ready to share.`);
  console.log("");
  console.log("Share options:");
  console.log("");
  console.log("  1. Git repository (recommended):");
  console.log(`     git init && git add -A && git commit -m "Initial commit"`);
  console.log(`     gh repo create pipe-step-${manifest.name} --public --source .`);
  console.log(
    `     Others install with: pipe install https://github.com/<user>/pipe-step-${manifest.name}.git`
  );
  console.log("");
  console.log("  2. Share directly:");
  console.log(`     zip -r ${manifest.name}.zip . && # send the zip`);
  console.log(`     Others install with: pipe install ./${manifest.name}`);
}
