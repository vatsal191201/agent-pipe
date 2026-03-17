import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";

interface TestCase {
  id: string;
  input: string;
  expected: string;
}

interface RunScore {
  caseId: string;
  similarity: number;
  output: string;
}

interface Run {
  pipeline: string;
  timestamp: string;
  scores: RunScore[];
  avgScore: number;
  totalTokens: number;
  totalLatency: number;
}

interface Challenge {
  name: string;
  description: string;
  created: string;
  cases: TestCase[];
  runs: Run[];
}

function defaultArenaDir(): string {
  return join(homedir(), ".pipe", "arena");
}

function ensureDir(dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function loadChallenge(
  name: string,
  dir?: string
): Challenge | undefined {
  const path = join(ensureDir(dir ?? defaultArenaDir()), `${name}.json`);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return undefined;
  }
}

export function saveChallenge(challenge: Challenge, dir?: string): void {
  const base = ensureDir(dir ?? defaultArenaDir());
  writeFileSync(
    join(base, `${challenge.name}.json`),
    JSON.stringify(challenge, null, 2) + "\n"
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function arenaCreate(
  name: string,
  description: string,
  dir?: string
): void {
  if (loadChallenge(name, dir)) {
    console.error(`Challenge "${name}" already exists.`);
    process.exit(1);
  }
  const challenge: Challenge = {
    name,
    description,
    created: new Date().toISOString(),
    cases: [],
    runs: [],
  };
  saveChallenge(challenge, dir);
  console.log(`Challenge "${name}" created.`);
  console.log(
    `Add test cases: pipe arena add-case ${name} --input "..." --expected "..."`
  );
}

export function arenaAddCase(
  name: string,
  input: string,
  expected: string,
  dir?: string
): void {
  const challenge = loadChallenge(name, dir);
  if (!challenge) {
    console.error(`Challenge "${name}" not found.`);
    process.exit(1);
  }
  const id = `case-${challenge.cases.length + 1}`;
  challenge.cases.push({ id, input, expected });
  saveChallenge(challenge, dir);
  console.log(
    `Added ${id} to "${name}" (${challenge.cases.length} cases total).`
  );
}

export async function arenaRun(
  name: string,
  pipelineArgs: string[],
  dir?: string
): Promise<void> {
  const challenge = loadChallenge(name, dir);
  if (!challenge) {
    console.error(`Challenge "${name}" not found.`);
    process.exit(1);
  }
  if (challenge.cases.length === 0) {
    console.error("No test cases. Add some first.");
    process.exit(1);
  }

  const pipeline = pipelineArgs.join(" ");
  console.log(
    `Running "${pipeline}" against ${challenge.cases.length} cases...\n`
  );

  const scores: RunScore[] = [];
  let totalTokens = 0;
  let totalLatency = 0;

  for (const testCase of challenge.cases) {
    const output = await runPipeline(pipeline, testCase.input);
    const similarity = jaccardSimilarity(output.stdout, testCase.expected);
    scores.push({ caseId: testCase.id, similarity, output: output.stdout });

    // Parse metadata from stderr
    for (const line of output.stderr.split("\n")) {
      if (line.startsWith("[pipe:meta]")) {
        try {
          const meta = JSON.parse(line.replace("[pipe:meta] ", ""));
          totalTokens +=
            (meta.tokens?.input ?? 0) + (meta.tokens?.output ?? 0);
          totalLatency += meta.latency_ms ?? 0;
        } catch {
          // ignore malformed meta lines
        }
      }
    }

    const bar = "\u2588"
      .repeat(Math.round(similarity * 20))
      .padEnd(20, "\u2591");
    console.log(
      `  ${testCase.id}: ${bar} ${(similarity * 100).toFixed(0)}%`
    );
  }

  const avgScore =
    scores.reduce((sum, s) => sum + s.similarity, 0) / scores.length;

  const run: Run = {
    pipeline,
    timestamp: new Date().toISOString(),
    scores,
    avgScore,
    totalTokens,
    totalLatency,
  };
  challenge.runs.push(run);
  saveChallenge(challenge, dir);

  console.log(
    `\nScore: ${(avgScore * 100).toFixed(1)}% | Tokens: ${totalTokens} | Latency: ${totalLatency}ms`
  );
}

function runPipeline(
  pipeline: string,
  input: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", ["-c", pipeline], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.stdin.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code !== "EPIPE") reject(err);
    });
    child.stdin.write(input);
    child.stdin.end();

    child.on("close", () => resolve({ stdout: stdout.trim(), stderr }));
    child.on("error", reject);
  });
}

export function arenaLeaderboard(name: string, dir?: string): void {
  const challenge = loadChallenge(name, dir);
  if (!challenge) {
    console.error(`Challenge "${name}" not found.`);
    process.exit(1);
  }
  if (challenge.runs.length === 0) {
    console.log("No runs yet.");
    return;
  }

  // Sort by average score descending
  const sorted = [...challenge.runs].sort((a, b) => b.avgScore - a.avgScore);

  console.log(`Leaderboard: ${name}`);
  console.log(`${challenge.description}\n`);
  console.log(
    "\u250C\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"
  );
  console.log(
    "\u2502 #  \u2502 Score  \u2502 Tokens \u2502 Latency  \u2502 Pipeline                            \u2502"
  );
  console.log(
    "\u251C\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524"
  );

  sorted.forEach((run, i) => {
    const rank = String(i + 1).padStart(2);
    const score = `${(run.avgScore * 100).toFixed(0)}%`.padStart(5);
    const tokens = String(run.totalTokens).padStart(6);
    const latency = `${run.totalLatency}ms`.padStart(8);
    const pipeline =
      run.pipeline.length > 35
        ? run.pipeline.slice(0, 32) + "..."
        : run.pipeline.padEnd(35);
    console.log(
      `\u2502 ${rank} \u2502 ${score} \u2502 ${tokens} \u2502 ${latency} \u2502 ${pipeline} \u2502`
    );
  });

  console.log(
    "\u2514\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"
  );
}

export function arenaList(dir?: string): void {
  const base = ensureDir(dir ?? defaultArenaDir());
  const files = existsSync(base)
    ? readdirSync(base).filter((f) => f.endsWith(".json"))
    : [];
  if (files.length === 0) {
    console.log(
      "No challenges yet. Create one: pipe arena create <name> --description '...'"
    );
    return;
  }
  console.log("Challenges:\n");
  for (const file of files) {
    try {
      const challenge: Challenge = JSON.parse(
        readFileSync(join(base, file), "utf-8")
      );
      console.log(
        `  ${challenge.name.padEnd(20)} ${challenge.cases.length} cases, ${challenge.runs.length} runs -- ${challenge.description}`
      );
    } catch {
      // skip malformed files
    }
  }
}
