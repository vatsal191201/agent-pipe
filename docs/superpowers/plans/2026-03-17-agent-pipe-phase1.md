# Agent Pipe Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working CLI where `echo "hello" | pipe claude` streams a Claude response to stdout, and users can chain steps with standard Unix pipes.

**Architecture:** Single TypeScript package compiled to a standalone CLI binary via `tsup`. Steps are internal modules (not child processes for Phase 1). Config lives in `~/.pipe/config.json`. Stdin is read fully, passed to the step function, output is streamed to stdout. Metadata emitted to stderr as `[pipe:meta]` JSON-lines.

**Tech Stack:** TypeScript, Node.js 22, tsup (build), Commander.js (CLI), Vercel AI SDK v6 with direct provider SDKs (LLM calls), vitest (tests)

---

## File Structure

```
agent-pipe/
├── src/
│   ├── index.ts              # CLI entry point (Commander setup, command routing)
│   ├── commands/
│   │   ├── run-step.ts       # `pipe <step>` -- execute a step with stdin
│   │   ├── list.ts           # `pipe list` -- show available steps
│   │   ├── save.ts           # `pipe save <name>` -- save a pipeline definition
│   │   ├── run-pipeline.ts   # `pipe run <name>` -- run a saved pipeline
│   │   └── config-cmd.ts     # `pipe config` -- manage global config
│   ├── runtime/
│   │   ├── stdin.ts          # Read all of stdin into a string
│   │   ├── meta.ts           # Emit [pipe:meta] JSON to stderr
│   │   └── config.ts         # Load/save ~/.pipe/config.json
│   ├── steps/
│   │   ├── registry.ts       # Maps step names -> step functions
│   │   ├── types.ts          # StepFn type, StepConfig, StepMeta interfaces
│   │   ├── claude.ts         # pipe claude
│   │   ├── openai.ts         # pipe openai
│   │   ├── summarize.ts      # pipe summarize
│   │   └── format.ts         # pipe format
│   └── version.ts            # Package version constant
├── tests/
│   ├── runtime/
│   │   ├── stdin.test.ts
│   │   ├── meta.test.ts
│   │   └── config.test.ts
│   ├── steps/
│   │   ├── registry.test.ts
│   │   ├── claude.test.ts
│   │   └── format.test.ts
│   └── commands/
│       ├── list.test.ts
│       └── save.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .gitignore
├── CLAUDE.md
└── README.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/vatsalb/Desktop/Research/brainstorm
npm init -y
```

Then edit `package.json` to:

```json
{
  "name": "agent-pipe",
  "version": "0.1.0",
  "description": "The Unix philosophy for AI agents",
  "type": "module",
  "bin": {
    "pipe": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "keywords": ["ai", "agent", "pipe", "cli", "llm"],
  "license": "MIT"
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install commander ai @ai-sdk/anthropic @ai-sdk/openai
npm install -D typescript tsup vitest @types/node
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.tgz
```

- [ ] **Step 7: Create directory structure**

```bash
mkdir -p src/commands src/runtime src/steps tests/runtime tests/steps tests/commands
```

- [ ] **Step 8: Verify build works**

Create minimal `src/index.ts`:
```typescript
console.log("agent-pipe");
```

Run:
```bash
npx tsup && node dist/index.js
```
Expected: prints "agent-pipe"

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore src/index.ts
git commit -m "chore: scaffold agent-pipe project"
```

---

### Task 2: Stdin Reader

**Files:**
- Create: `src/runtime/stdin.ts`
- Test: `tests/runtime/stdin.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/runtime/stdin.test.ts
import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { readStdin } from "../../src/runtime/stdin.js";

describe("readStdin", () => {
  it("reads all data from a readable stream", async () => {
    const stream = Readable.from(["hello ", "world"]);
    const result = await readStdin(stream);
    expect(result).toBe("hello world");
  });

  it("returns empty string for empty stream", async () => {
    const stream = Readable.from([]);
    const result = await readStdin(stream);
    expect(result).toBe("");
  });

  it("handles multi-line input", async () => {
    const stream = Readable.from(["line1\n", "line2\n", "line3"]);
    const result = await readStdin(stream);
    expect(result).toBe("line1\nline2\nline3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/runtime/stdin.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation**

```typescript
// src/runtime/stdin.ts
import type { Readable } from "node:stream";

export async function readStdin(
  stream: Readable = process.stdin
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export function isTTY(): boolean {
  return process.stdin.isTTY === true;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/runtime/stdin.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/runtime/stdin.ts tests/runtime/stdin.test.ts
git commit -m "feat: add stdin reader utility"
```

---

### Task 3: Metadata Emitter

**Files:**
- Create: `src/runtime/meta.ts`
- Test: `tests/runtime/meta.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/runtime/meta.test.ts
import { describe, it, expect, vi } from "vitest";
import { emitMeta, formatMeta } from "../../src/runtime/meta.js";

describe("formatMeta", () => {
  it("formats metadata as [pipe:meta] JSON line", () => {
    const meta = { step: "claude", model: "claude-sonnet-4.6", latency_ms: 500 };
    const result = formatMeta(meta);
    expect(result).toBe('[pipe:meta] {"step":"claude","model":"claude-sonnet-4.6","latency_ms":500}');
  });
});

describe("emitMeta", () => {
  it("writes formatted metadata to stderr", () => {
    const mockStderr = { write: vi.fn() };
    emitMeta({ step: "test" }, mockStderr as any);
    expect(mockStderr.write).toHaveBeenCalledWith(
      '[pipe:meta] {"step":"test"}\n'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/runtime/meta.test.ts
```
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/runtime/meta.ts
import type { Writable } from "node:stream";

export interface PipeMeta {
  step: string;
  model?: string;
  tokens?: { input: number; output: number };
  latency_ms?: number;
  [key: string]: unknown;
}

export function formatMeta(meta: PipeMeta): string {
  return `[pipe:meta] ${JSON.stringify(meta)}`;
}

export function emitMeta(
  meta: PipeMeta,
  stream: Writable = process.stderr
): void {
  stream.write(formatMeta(meta) + "\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/runtime/meta.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/runtime/meta.ts tests/runtime/meta.test.ts
git commit -m "feat: add stderr metadata emitter"
```

---

### Task 4: Config System

**Files:**
- Create: `src/runtime/config.ts`
- Test: `tests/runtime/config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/runtime/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig, getApiKey, type PipeConfig } from "../../src/runtime/config.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("config", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns default config when no file exists", () => {
    const config = loadConfig(join(tempDir, "config.json"));
    expect(config.default_model).toBe("anthropic/claude-sonnet-4.6");
    expect(config.api_keys).toEqual({});
  });

  it("loads existing config file", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(configPath, JSON.stringify({ default_model: "openai/gpt-5.4" }));
    const config = loadConfig(configPath);
    expect(config.default_model).toBe("openai/gpt-5.4");
  });

  it("saves config to file", () => {
    const configPath = join(tempDir, "config.json");
    const config: PipeConfig = {
      default_model: "openai/gpt-5.4",
      api_keys: { openai: "sk-test" },
      telemetry: false,
    };
    saveConfig(config, configPath);
    const loaded = loadConfig(configPath);
    expect(loaded.default_model).toBe("openai/gpt-5.4");
  });

  it("resolves API key from config", () => {
    const config: PipeConfig = {
      default_model: "anthropic/claude-sonnet-4.6",
      api_keys: { anthropic: "sk-ant-test" },
      telemetry: false,
    };
    expect(getApiKey("anthropic", config)).toBe("sk-ant-test");
  });

  it("resolves API key from environment variable", () => {
    process.env.ANTHROPIC_API_KEY = "sk-from-env";
    const config: PipeConfig = {
      default_model: "anthropic/claude-sonnet-4.6",
      api_keys: {},
      telemetry: false,
    };
    expect(getApiKey("anthropic", config)).toBe("sk-from-env");
    delete process.env.ANTHROPIC_API_KEY;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/runtime/config.test.ts
```
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/runtime/config.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface PipeConfig {
  default_model: string;
  api_keys: Record<string, string>;
  telemetry: boolean;
}

const DEFAULT_CONFIG: PipeConfig = {
  default_model: "anthropic/claude-sonnet-4.6",
  api_keys: {},
  telemetry: false,
};

const ENV_KEY_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export function defaultConfigPath(): string {
  return join(homedir(), ".pipe", "config.json");
}

export function loadConfig(path: string = defaultConfigPath()): PipeConfig {
  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(
  config: PipeConfig,
  path: string = defaultConfigPath()
): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}

export function getApiKey(
  provider: string,
  config: PipeConfig = loadConfig()
): string | undefined {
  if (config.api_keys[provider]) {
    return config.api_keys[provider];
  }
  const envVar = ENV_KEY_MAP[provider];
  if (envVar) {
    return process.env[envVar];
  }
  return process.env[`${provider.toUpperCase()}_API_KEY`];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/runtime/config.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/runtime/config.ts tests/runtime/config.test.ts
git commit -m "feat: add config system with env var fallback"
```

---

### Task 5: Step Types and Registry

**Files:**
- Create: `src/steps/types.ts`
- Create: `src/steps/registry.ts`
- Test: `tests/steps/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/steps/registry.test.ts
import { describe, it, expect } from "vitest";
import { getStep, listSteps, hasStep } from "../../src/steps/registry.js";

describe("step registry", () => {
  it("lists all built-in steps", () => {
    const steps = listSteps();
    expect(steps).toContain("claude");
    expect(steps).toContain("openai");
    expect(steps).toContain("summarize");
    expect(steps).toContain("format");
    expect(steps.length).toBeGreaterThanOrEqual(4);
  });

  it("returns a step by name", () => {
    const step = getStep("claude");
    expect(step).toBeDefined();
    expect(step!.name).toBe("claude");
    expect(step!.description).toBeTruthy();
    expect(typeof step!.run).toBe("function");
  });

  it("returns undefined for unknown step", () => {
    expect(getStep("nonexistent")).toBeUndefined();
  });

  it("checks if step exists", () => {
    expect(hasStep("claude")).toBe(true);
    expect(hasStep("nonexistent")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/steps/registry.test.ts
```
Expected: FAIL

- [ ] **Step 3: Write types**

```typescript
// src/steps/types.ts
import type { PipeMeta } from "../runtime/meta.js";
import type { PipeConfig } from "../runtime/config.js";

export interface StepContext {
  input: string;
  config: Record<string, string>;
  globalConfig: PipeConfig;
}

export type StepFn = (ctx: StepContext) => AsyncGenerator<string, PipeMeta, unknown>;

export interface StepDefinition {
  name: string;
  description: string;
  configSchema?: Record<string, { type: string; default?: string; description?: string }>;
  run: StepFn;
}
```

- [ ] **Step 4: Write registry with placeholder step imports**

```typescript
// src/steps/registry.ts
import type { StepDefinition } from "./types.js";

const steps = new Map<string, StepDefinition>();

export function registerStep(step: StepDefinition): void {
  steps.set(step.name, step);
}

export function getStep(name: string): StepDefinition | undefined {
  return steps.get(name);
}

export function listSteps(): string[] {
  return Array.from(steps.keys()).sort();
}

export function hasStep(name: string): boolean {
  return steps.has(name);
}

// Register built-in steps
import { claudeStep } from "./claude.js";
import { openaiStep } from "./openai.js";
import { summarizeStep } from "./summarize.js";
import { formatStep } from "./format.js";

registerStep(claudeStep);
registerStep(openaiStep);
registerStep(summarizeStep);
registerStep(formatStep);
```

- [ ] **Step 5: Create placeholder step files**

Each exports a `StepDefinition` with a stub `run`. Real implementations in Tasks 6-8.

`src/steps/claude.ts`:
```typescript
import type { StepDefinition } from "./types.js";

export const claudeStep: StepDefinition = {
  name: "claude",
  description: "Send input to Claude and stream the response",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "claude" };
  },
};
```

`src/steps/openai.ts`:
```typescript
import type { StepDefinition } from "./types.js";

export const openaiStep: StepDefinition = {
  name: "openai",
  description: "Send input to OpenAI and stream the response",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "openai" };
  },
};
```

`src/steps/summarize.ts`:
```typescript
import type { StepDefinition } from "./types.js";

export const summarizeStep: StepDefinition = {
  name: "summarize",
  description: "Summarize the input text",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "summarize" };
  },
};
```

`src/steps/format.ts`:
```typescript
import type { StepDefinition } from "./types.js";

export const formatStep: StepDefinition = {
  name: "format",
  description: "Format input into a specified format (md, json, csv, yaml)",
  run: async function* (ctx) {
    yield ctx.input;
    return { step: "format" };
  },
};
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run tests/steps/registry.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/steps/types.ts src/steps/registry.ts src/steps/claude.ts src/steps/openai.ts src/steps/summarize.ts src/steps/format.ts tests/steps/registry.test.ts
git commit -m "feat: add step type system and registry"
```

---

### Task 6: Claude Step (The Hero Feature)

**Files:**
- Modify: `src/steps/claude.ts`
- Test: `tests/steps/claude.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/steps/claude.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StepContext } from "../../src/steps/types.js";

vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => "mock-model")),
}));

import { claudeStep } from "../../src/steps/claude.js";
import { streamText } from "ai";

describe("claude step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams text from Claude API", async () => {
    const mockStream = (async function* () {
      yield "Hello";
      yield " from";
      yield " Claude";
    })();

    vi.mocked(streamText).mockResolvedValue({
      textStream: mockStream,
      usage: Promise.resolve({ promptTokens: 10, completionTokens: 20 }),
    } as any);

    const ctx: StepContext = {
      input: "Say hello",
      config: {},
      globalConfig: {
        default_model: "anthropic/claude-sonnet-4.6",
        api_keys: { anthropic: "sk-test" },
        telemetry: false,
      },
    };

    const chunks: string[] = [];
    let meta;
    const gen = claudeStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        meta = value;
        break;
      }
      chunks.push(value);
    }

    expect(chunks.join("")).toBe("Hello from Claude");
    expect(meta).toMatchObject({ step: "claude" });
    expect(streamText).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/steps/claude.test.ts
```
Expected: FAIL (placeholder doesn't call streamText)

- [ ] **Step 3: Implement the real Claude step**

Check AI SDK v6 docs first: `streamText` from `ai`, `createAnthropic` from `@ai-sdk/anthropic`.

```typescript
// src/steps/claude.ts
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

export const claudeStep: StepDefinition = {
  name: "claude",
  description: "Send input to Claude and stream the response",
  configSchema: {
    model: { type: "string", default: "claude-sonnet-4.6", description: "Claude model to use" },
    system: { type: "string", description: "System prompt" },
    "max-tokens": { type: "string", default: "4096", description: "Maximum output tokens" },
  },
  run: async function* (ctx: StepContext) {
    const apiKey = getApiKey("anthropic", ctx.globalConfig);
    if (!apiKey) {
      throw new Error(
        "No Anthropic API key found. Set ANTHROPIC_API_KEY or run: pipe config set api_keys.anthropic <key>"
      );
    }

    const anthropic = createAnthropic({ apiKey });
    const modelId = ctx.config.model || ctx.globalConfig.default_model?.replace("anthropic/", "") || "claude-sonnet-4.6";
    const model = anthropic(modelId);
    const startTime = Date.now();

    const result = await streamText({
      model,
      prompt: ctx.input,
      ...(ctx.config.system ? { system: ctx.config.system } : {}),
      maxTokens: ctx.config["max-tokens"] ? parseInt(ctx.config["max-tokens"]) : 4096,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "claude",
      model: modelId,
      tokens: { input: usage.promptTokens, output: usage.completionTokens },
      latency_ms: Date.now() - startTime,
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/steps/claude.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/steps/claude.ts tests/steps/claude.test.ts
git commit -m "feat: implement claude step with streaming"
```

---

### Task 7: OpenAI Step

**Files:**
- Modify: `src/steps/openai.ts`

- [ ] **Step 1: Implement the OpenAI step** (mirrors claude.ts)

```typescript
// src/steps/openai.ts
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

export const openaiStep: StepDefinition = {
  name: "openai",
  description: "Send input to OpenAI and stream the response",
  configSchema: {
    model: { type: "string", default: "gpt-5.4", description: "OpenAI model to use" },
    system: { type: "string", description: "System prompt" },
    "max-tokens": { type: "string", default: "4096", description: "Maximum output tokens" },
  },
  run: async function* (ctx: StepContext) {
    const apiKey = getApiKey("openai", ctx.globalConfig);
    if (!apiKey) {
      throw new Error(
        "No OpenAI API key found. Set OPENAI_API_KEY or run: pipe config set api_keys.openai <key>"
      );
    }

    const openai = createOpenAI({ apiKey });
    const modelId = ctx.config.model || "gpt-5.4";
    const model = openai(modelId);
    const startTime = Date.now();

    const result = await streamText({
      model,
      prompt: ctx.input,
      ...(ctx.config.system ? { system: ctx.config.system } : {}),
      maxTokens: ctx.config["max-tokens"] ? parseInt(ctx.config["max-tokens"]) : 4096,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "openai",
      model: modelId,
      tokens: { input: usage.promptTokens, output: usage.completionTokens },
      latency_ms: Date.now() - startTime,
    };
  },
};
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/steps/openai.ts
git commit -m "feat: implement openai step"
```

---

### Task 8: Summarize and Format Steps

**Files:**
- Modify: `src/steps/summarize.ts`
- Modify: `src/steps/format.ts`
- Test: `tests/steps/format.test.ts`

- [ ] **Step 1: Write format step test**

```typescript
// tests/steps/format.test.ts
import { describe, it, expect } from "vitest";
import { formatStep } from "../../src/steps/format.js";
import type { StepContext } from "../../src/steps/types.js";

describe("format step", () => {
  const baseCtx: Omit<StepContext, "config"> = {
    input: "Hello world\nThis is a test",
    globalConfig: { default_model: "", api_keys: {}, telemetry: false },
  };

  it("wraps text in JSON with format=json", async () => {
    const ctx = { ...baseCtx, config: { format: "json" } };
    const chunks: string[] = [];
    const gen = formatStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) break;
      chunks.push(value);
    }
    const output = chunks.join("");
    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toHaveProperty("content");
  });

  it("passes through text when no format specified", async () => {
    const ctx = { ...baseCtx, config: {} };
    const chunks: string[] = [];
    const gen = formatStep.run(ctx);
    while (true) {
      const { value, done } = await gen.next();
      if (done) break;
      chunks.push(value);
    }
    expect(chunks.join("")).toBe("Hello world\nThis is a test");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/steps/format.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement format step**

```typescript
// src/steps/format.ts
import type { StepDefinition, StepContext } from "./types.js";

export const formatStep: StepDefinition = {
  name: "format",
  description: "Format input into a specified format (md, json, csv, yaml)",
  configSchema: {
    format: { type: "string", default: "passthrough", description: "Output format: md, json, csv, or passthrough" },
  },
  run: async function* (ctx: StepContext) {
    const fmt = ctx.config.format || "passthrough";

    switch (fmt) {
      case "json":
        yield JSON.stringify({ content: ctx.input, lines: ctx.input.split("\n") }, null, 2);
        break;
      case "csv": {
        const lines = ctx.input.split("\n");
        yield lines.map((line) => `"${line.replace(/"/g, '""')}"`).join("\n");
        break;
      }
      case "md":
      default:
        yield ctx.input;
    }

    return { step: "format", format: fmt };
  },
};
```

- [ ] **Step 4: Implement summarize step** (uses cheapest available model)

```typescript
// src/steps/summarize.ts
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { StepDefinition, StepContext } from "./types.js";
import { getApiKey } from "../runtime/config.js";

const LENGTH_GUIDE: Record<string, string> = {
  short: "1-2 sentences",
  medium: "3-5 sentences",
  long: "1-2 paragraphs",
};

const STYLE_GUIDE: Record<string, string> = {
  bullets: "Use bullet points.",
  prose: "Write in prose.",
  technical: "Use technical language.",
};

export const summarizeStep: StepDefinition = {
  name: "summarize",
  description: "Summarize the input text using an LLM",
  configSchema: {
    length: { type: "string", default: "medium", description: "Summary length: short, medium, long" },
    style: { type: "string", default: "prose", description: "Style: bullets, prose, technical" },
  },
  run: async function* (ctx: StepContext) {
    const length = ctx.config.length || "medium";
    const style = ctx.config.style || "prose";

    const systemPrompt = `Summarize the following text in ${LENGTH_GUIDE[length] || LENGTH_GUIDE.medium}. ${STYLE_GUIDE[style] || STYLE_GUIDE.prose} Output only the summary, nothing else.`;

    let model: any;
    let modelId: string;
    const anthropicKey = getApiKey("anthropic", ctx.globalConfig);
    const openaiKey = getApiKey("openai", ctx.globalConfig);

    if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      modelId = "claude-haiku-4.5";
      model = anthropic(modelId);
    } else if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      modelId = "gpt-4.1-mini";
      model = openai(modelId);
    } else {
      throw new Error("No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
    }

    const startTime = Date.now();
    const result = await streamText({ model, system: systemPrompt, prompt: ctx.input });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    const usage = await result.usage;
    return {
      step: "summarize",
      model: modelId,
      tokens: { input: usage.promptTokens, output: usage.completionTokens },
      latency_ms: Date.now() - startTime,
    };
  },
};
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/steps/format.ts src/steps/summarize.ts tests/steps/format.test.ts
git commit -m "feat: implement format and summarize steps"
```

---

### Task 9: CLI Entry Point and Run-Step Command

**Files:**
- Modify: `src/index.ts`
- Create: `src/commands/run-step.ts`
- Create: `src/version.ts`

- [ ] **Step 1: Create version constant**

```typescript
// src/version.ts
export const VERSION = "0.1.0";
```

- [ ] **Step 2: Create run-step command**

This is the core command that reads stdin, runs a step, and streams output to stdout.

```typescript
// src/commands/run-step.ts
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
    process.stderr.write(`Unknown step: ${stepName}\n`);
    process.stderr.write(`Run 'pipe list' to see available steps.\n`);
    process.exit(1);
  }

  // Parse --config key=value pairs
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

  // Manually iterate to capture the return value (metadata)
  let meta;
  while (true) {
    const { value, done } = await generator.next();
    if (done) {
      meta = value;
      break;
    }
    process.stdout.write(value);
  }

  // Ensure trailing newline for clean terminal output
  process.stdout.write("\n");

  if (meta) {
    emitMeta(meta);
  }
}
```

- [ ] **Step 3: Create the CLI entry point**

```typescript
// src/index.ts
import { Command } from "commander";
import { VERSION } from "./version.js";
import { runStep } from "./commands/run-step.js";

const program = new Command();

program
  .name("pipe")
  .description("The Unix philosophy for AI agents")
  .version(VERSION);

// Subcommands first (so they get priority over the default argument)
program
  .command("list")
  .description("List available steps")
  .action(async () => {
    const { listCommand } = await import("./commands/list.js");
    listCommand();
  });

program
  .command("save <name> <definition>")
  .description("Save a pipeline definition")
  .action(async (name: string, definition: string) => {
    const { saveCommand } = await import("./commands/save.js");
    saveCommand(name, definition);
  });

program
  .command("run <name>")
  .description("Run a saved pipeline")
  .action(async (name: string) => {
    const { runPipelineCommand } = await import("./commands/run-pipeline.js");
    await runPipelineCommand(name);
  });

// Default: pipe <step> runs a step
program
  .argument("[step]", "Step to execute")
  .option("-c, --config <pairs...>", "Config overrides (key=value)")
  .action(async (step: string | undefined, options: { config?: string[] }) => {
    if (!step) {
      program.help();
      return;
    }
    await runStep(step, options);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 4: Build and test help output**

```bash
npx tsup && node dist/index.js --help
```
Expected: shows "The Unix philosophy for AI agents" and commands

- [ ] **Step 5: Test list command**

```bash
node dist/index.js list
```
Expected: lists claude, format, openai, summarize

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/commands/run-step.ts src/version.ts
git commit -m "feat: CLI entry point with step execution"
```

---

### Task 10: List Command

**Files:**
- Create: `src/commands/list.ts`
- Test: `tests/commands/list.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/commands/list.test.ts
import { describe, it, expect } from "vitest";
import { formatStepList } from "../../src/commands/list.js";

describe("list command", () => {
  it("formats step list with names and descriptions", () => {
    const output = formatStepList();
    expect(output).toContain("claude");
    expect(output).toContain("openai");
    expect(output).toContain("summarize");
    expect(output).toContain("format");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/commands/list.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/commands/list.ts
import { listSteps, getStep } from "../steps/registry.js";

export function formatStepList(): string {
  const steps = listSteps();
  const lines = steps.map((name) => {
    const step = getStep(name)!;
    return `  ${name.padEnd(15)} ${step.description}`;
  });
  return `Available steps:\n\n${lines.join("\n")}`;
}

export function listCommand(): void {
  console.log(formatStepList());
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/commands/list.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/list.ts tests/commands/list.test.ts
git commit -m "feat: add list command"
```

---

### Task 11: Save and Run Pipeline Commands

**Files:**
- Create: `src/commands/save.ts`
- Create: `src/commands/run-pipeline.ts`
- Test: `tests/commands/save.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/commands/save.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { savePipeline, loadPipeline, listPipelines } from "../../src/commands/save.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("pipeline save/load", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("saves and loads a pipeline definition", () => {
    savePipeline("review", "pipe claude --config system='Review this code'", tempDir);
    const pipeline = loadPipeline("review", tempDir);
    expect(pipeline).toBeDefined();
    expect(pipeline!.name).toBe("review");
    expect(pipeline!.definition).toContain("pipe claude");
  });

  it("returns undefined for unknown pipeline", () => {
    expect(loadPipeline("nonexistent", tempDir)).toBeUndefined();
  });

  it("lists saved pipelines", () => {
    savePipeline("review", "pipe claude", tempDir);
    savePipeline("test", "pipe openai", tempDir);
    const names = listPipelines(tempDir);
    expect(names).toContain("review");
    expect(names).toContain("test");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/commands/save.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement save.ts**

```typescript
// src/commands/save.ts
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
```

- [ ] **Step 4: Implement run-pipeline.ts**

Uses `child_process.spawn` (not `exec`) to safely run saved pipelines. The definition is split into arguments and passed to spawn for safer execution.

```typescript
// src/commands/run-pipeline.ts
import { spawn } from "node:child_process";
import { loadPipeline } from "./save.js";
import { readStdin, isTTY } from "../runtime/stdin.js";

export async function runPipelineCommand(name: string): Promise<void> {
  const pipeline = loadPipeline(name);
  if (!pipeline) {
    process.stderr.write(`Unknown pipeline: ${name}\n`);
    process.stderr.write(`Saved pipelines: pipe save <name> <definition>\n`);
    process.exit(1);
  }

  let input = "";
  if (!isTTY()) {
    input = await readStdin();
  }

  // Run pipeline definition using shell for pipe support
  // This is intentional -- pipeline definitions are user-authored,
  // not arbitrary external input.
  const child = spawn("sh", ["-c", pipeline.definition], {
    stdio: [input ? "pipe" : "inherit", "inherit", "inherit"],
    env: process.env,
  });

  if (input && child.stdin) {
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
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/commands/save.ts src/commands/run-pipeline.ts tests/commands/save.test.ts
git commit -m "feat: add save and run pipeline commands"
```

---

### Task 12: CLAUDE.md and README

**Files:**
- Create: `CLAUDE.md`
- Create: `README.md`

- [ ] **Step 1: Create CLAUDE.md**

Write CLAUDE.md with:
- Project description
- Build/test/lint commands
- Architecture overview (src/index.ts entry, commands/, runtime/, steps/)
- Step interface contract (async generators: yield chunks, return metadata)
- Config resolution order (config file → env vars)
- Testing convention (vitest, mock AI SDK)

- [ ] **Step 2: Create README.md**

Write README.md with:
- Project tagline and description
- Install instructions (`npm install -g agent-pipe`)
- Usage examples (pipe claude, chaining, config, save/run)
- Available steps table
- Configuration instructions
- License (MIT)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add CLAUDE.md and README"
```

---

### Task 13: End-to-End Verification

- [ ] **Step 1: Build**

```bash
npx tsup
```

- [ ] **Step 2: Make binary executable**

```bash
chmod +x dist/index.js
```

- [ ] **Step 3: Verify help**

```bash
node dist/index.js --help
```
Expected: "The Unix philosophy for AI agents", list of commands

- [ ] **Step 4: Verify list**

```bash
node dist/index.js list
```
Expected: claude, format, openai, summarize with descriptions

- [ ] **Step 5: Verify pipe claude** (requires ANTHROPIC_API_KEY)

```bash
echo "Say hello in 3 words" | node dist/index.js claude 2>/dev/null
```
Expected: 3-word response streamed. stderr has `[pipe:meta]` JSON.

- [ ] **Step 6: Verify chaining**

```bash
echo "List 3 languages" | node dist/index.js claude 2>/dev/null | node dist/index.js format -c format=json
```
Expected: Claude response wrapped in JSON

- [ ] **Step 7: Verify save/run**

```bash
node dist/index.js save greet "echo Hi | node dist/index.js claude -c system='Be cheerful'"
node dist/index.js run greet 2>/dev/null
```
Expected: cheerful Claude response

- [ ] **Step 8: Full test suite**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 9: Commit final state**

```bash
git add -A
git commit -m "feat: agent-pipe v0.1.0 MVP complete"
```
