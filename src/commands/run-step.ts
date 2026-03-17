import { getStep } from "../steps/registry.js";
import { readStdin, isTTY } from "../runtime/stdin.js";
import { emitMeta } from "../runtime/meta.js";
import { loadConfig } from "../runtime/config.js";

export async function runStep(
  stepName: string,
  options: { config?: string[] }
): Promise<void> {
  const step = getStep(stepName);
  if (!step) {
    process.stderr.write(`Unknown step: ${stepName}\nRun 'pipe list' to see available steps.\n`);
    process.exit(1);
  }

  const configPairs: Record<string, string> = {};
  if (options.config) {
    for (const pair of options.config) {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) {
        process.stderr.write(`Invalid config: ${pair}. Use key=value format.\n`);
        process.exit(1);
      }
      configPairs[pair.slice(0, eqIndex)] = pair.slice(eqIndex + 1);
    }
  }

  if (isTTY()) {
    process.stderr.write("Reading from stdin... (pipe data in or type input, then Ctrl+D)\n");
  }
  const input = await readStdin();

  if (!input.trim()) {
    process.stderr.write("No input received. Pipe data into the command:\n");
    process.stderr.write(`  echo "your text" | pipe ${stepName}\n`);
    process.exit(1);
  }

  const globalConfig = loadConfig();
  const generator = step.run({ input, config: configPairs, globalConfig });

  let meta;
  while (true) {
    const { value, done } = await generator.next();
    if (done) {
      meta = value;
      break;
    }
    process.stdout.write(value);
  }

  process.stdout.write("\n");

  if (meta) {
    emitMeta(meta);
  }
}
