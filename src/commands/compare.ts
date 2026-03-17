import { streamText } from "ai";
import { readStdin, isTTY } from "../runtime/stdin.js";
import { loadConfig } from "../runtime/config.js";
import { resolveModel } from "../steps/llm.js";
import { parseMaxTokens } from "../steps/cheapest-model.js";

interface ModelResult {
  modelString: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
}

export async function compareCommand(
  models: string[],
  options: { config?: string[] }
): Promise<void> {
  if (models.length < 2) {
    process.stderr.write("Compare requires at least 2 models.\n");
    process.stderr.write(
      'Usage: echo "prompt" | pipe compare provider/model1 provider/model2\n'
    );
    process.exit(1);
  }

  // Parse config overrides
  const configPairs: Record<string, string> = {};
  if (options.config) {
    for (const pair of options.config) {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) {
        process.stderr.write(
          `Invalid config: ${pair}. Use key=value format.\n`
        );
        process.exit(1);
      }
      configPairs[pair.slice(0, eqIndex)] = pair.slice(eqIndex + 1);
    }
  }

  if (isTTY()) {
    process.stderr.write(
      "Reading from stdin... (pipe data in or type input, then Ctrl+D)\n"
    );
  }
  const input = await readStdin();

  if (!input.trim()) {
    process.stderr.write("No input received. Pipe data into the command:\n");
    process.stderr.write(
      '  echo "your prompt" | pipe compare model1 model2\n'
    );
    process.exit(1);
  }

  const globalConfig = loadConfig();
  const maxTokens = parseMaxTokens(configPairs["max-tokens"]);

  process.stderr.write(`Comparing ${models.length} models...\n`);

  // Run all models in parallel
  const promises = models.map(async (modelString): Promise<ModelResult> => {
    const startTime = Date.now();
    try {
      const { model } = resolveModel(modelString, globalConfig);
      const result = await streamText({
        model,
        prompt: input.trim(),
        ...(configPairs.system ? { system: configPairs.system } : {}),
        maxOutputTokens: maxTokens,
      });

      const text = await result.text;
      const usage = await result.usage;
      const latencyMs = Date.now() - startTime;

      return {
        modelString,
        text,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        latencyMs,
      };
    } catch (err: any) {
      return {
        modelString,
        text: "",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        error: err.message,
      };
    }
  });

  const results = await Promise.allSettled(promises);
  const modelResults: ModelResult[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      modelString: models[i],
      text: "",
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      error: r.reason?.message ?? "Unknown error",
    };
  });

  // Print each response with header
  for (const r of modelResults) {
    process.stdout.write("\n");
    if (r.error) {
      process.stdout.write(
        `\u2550\u2550\u2550 ${r.modelString} (ERROR) \u2550\u2550\u2550\n`
      );
      process.stdout.write(`Error: ${r.error}\n`);
    } else {
      process.stdout.write(
        `\u2550\u2550\u2550 ${r.modelString} (${r.latencyMs}ms, ${r.inputTokens}\u2192${r.outputTokens} tokens) \u2550\u2550\u2550\n`
      );
      process.stdout.write(r.text + "\n");
    }
  }

  // Print summary table
  process.stdout.write("\n\u2550\u2550\u2550 Summary \u2550\u2550\u2550\n");

  // Calculate column widths
  const modelColWidth = Math.max(
    5,
    ...modelResults.map((r) => r.modelString.length)
  );
  const pad = (s: string, w: number) => s.padEnd(w);

  // Header
  process.stdout.write(
    `\u250C${"\u2500".repeat(modelColWidth + 2)}\u252C${ "\u2500".repeat(10)}\u252C${"\u2500".repeat(10)}\u252C${"\u2500".repeat(10)}\u2510\n`
  );
  process.stdout.write(
    `\u2502 ${pad("Model", modelColWidth)} \u2502 ${pad("Input", 8)} \u2502 ${pad("Output", 8)} \u2502 ${pad("Time", 8)} \u2502\n`
  );
  process.stdout.write(
    `\u251C${"\u2500".repeat(modelColWidth + 2)}\u253C${"\u2500".repeat(10)}\u253C${"\u2500".repeat(10)}\u253C${"\u2500".repeat(10)}\u2524\n`
  );

  // Rows
  for (const r of modelResults) {
    if (r.error) {
      process.stdout.write(
        `\u2502 ${pad(r.modelString, modelColWidth)} \u2502 ${pad("ERROR", 8)} \u2502 ${pad("-", 8)} \u2502 ${pad("-", 8)} \u2502\n`
      );
    } else {
      process.stdout.write(
        `\u2502 ${pad(r.modelString, modelColWidth)} \u2502 ${pad(String(r.inputTokens), 8)} \u2502 ${pad(String(r.outputTokens), 8)} \u2502 ${pad(r.latencyMs + "ms", 8)} \u2502\n`
      );
    }
  }

  // Footer
  process.stdout.write(
    `\u2514${"\u2500".repeat(modelColWidth + 2)}\u2534${"\u2500".repeat(10)}\u2534${"\u2500".repeat(10)}\u2534${"\u2500".repeat(10)}\u2518\n`
  );
}
