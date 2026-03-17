import { spawn } from "node:child_process";
import { loadPipeline } from "./save.js";
import { readStdin, isTTY } from "../runtime/stdin.js";

export async function runPipelineCommand(name: string): Promise<void> {
  const pipeline = loadPipeline(name);
  if (!pipeline) {
    process.stderr.write(`Unknown pipeline: ${name}\nSaved pipelines: pipe save <name> <definition>\n`);
    process.exit(1);
  }

  let input = "";
  if (!isTTY()) {
    input = await readStdin();
  }

  const child = spawn("sh", ["-c", pipeline.definition], {
    stdio: [input ? "pipe" : "inherit", "inherit", "inherit"],
    env: process.env,
  });

  if (input && child.stdin) {
    child.stdin.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code !== "EPIPE") throw err;
    });
    child.stdin.write(input);
    child.stdin.end();
  }

  const exitCode = await new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
