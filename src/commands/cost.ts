import { readStdin } from "../runtime/stdin.js";

// Approximate cost per million tokens (as of 2026)
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-5.4": { input: 2.5, output: 10 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
};

export async function costCommand(): Promise<void> {
  const input = await readStdin();
  const lines = input.split("\n").filter((l) => l.startsWith("[pipe:meta]"));

  if (lines.length === 0) {
    console.log(
      "No [pipe:meta] data found. Redirect stderr to capture metadata:"
    );
    console.log(
      '  echo "text" | pipe claude 2>meta.log && pipe cost < meta.log'
    );
    return;
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalLatency = 0;
  let totalCost = 0;
  const steps: Array<{
    step: string;
    model: string;
    input: number;
    output: number;
    latency: number;
    cost: number;
  }> = [];

  for (const line of lines) {
    const json = line.replace("[pipe:meta] ", "");
    try {
      const meta = JSON.parse(json);
      const inputTokens = meta.tokens?.input ?? 0;
      const outputTokens = meta.tokens?.output ?? 0;
      const latency = meta.latency_ms ?? 0;
      const model = meta.model || "unknown";

      const rates = COST_TABLE[model] || { input: 1, output: 3 }; // default estimate
      const cost =
        (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      totalLatency += latency;
      totalCost += cost;

      steps.push({
        step: meta.step || "unknown",
        model,
        input: inputTokens,
        output: outputTokens,
        latency,
        cost,
      });
    } catch {
      // skip malformed lines
    }
  }

  // Print per-step breakdown
  console.log("Pipeline Cost Summary");
  console.log("\u2500".repeat(60));
  for (const s of steps) {
    console.log(
      `  ${s.step.padEnd(12)} ${s.model.padEnd(25)} ${s.input}\u2192${s.output} tokens  ${s.latency}ms  $${s.cost.toFixed(6)}`
    );
  }
  console.log("\u2500".repeat(60));
  console.log(
    `  Total: ${totalInputTokens}\u2192${totalOutputTokens} tokens  ${totalLatency}ms  $${totalCost.toFixed(6)}`
  );
}
