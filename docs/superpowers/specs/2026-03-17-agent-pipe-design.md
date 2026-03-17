# Agent Pipe -- Design Specification

**Date:** 2026-03-17
**Status:** Draft
**Author:** Vatsal + Claude

---

## Vision

Agent Pipe brings the Unix philosophy to AI agents. Chain agents together using the pipe operator (`|`), just like shell commands. Each agent step reads stdin, processes, and writes stdout. No frameworks, no YAML, no orchestration config. Dead simple composition through the metaphor every developer already knows.

**Tagline:** "The Unix philosophy for AI agents"

**One-liner:** `echo "review this PR" | pipe claude | pipe summarize | pipe slack-post`

---

## Why Agent Pipe First

Agent Pipe is the **platform** that the other three ideas plug into:

- **Squeeze** becomes `pipe squeeze` -- a compression step before expensive model calls
- **TinyForge** becomes `pipe apply-adapter legal-v2` -- apply adapters before agent calls
- **Agent Arena** becomes competitive pipeline scoring -- who builds the best pipeline for task X

The pipe is the composability primitive. Everything else is a step.

---

## Core Concepts

### Steps
A **step** is any process that:
1. Reads from stdin (text, JSON, or binary)
2. Processes the input (calling an LLM, transforming data, making API calls)
3. Writes to stdout

Steps are standalone executables. They can be shell scripts, Node.js scripts, Python scripts, compiled binaries -- anything that follows the stdin/stdout contract.

### Pipelines
A **pipeline** is a sequence of steps connected by pipes:
```
pipe step-a | pipe step-b | pipe step-c
```

Pipelines can be saved and shared:
```
pipe save my-pipeline "pipe analyze | pipe summarize | pipe format-md"
pipe run my-pipeline < input.txt
```

### Registry
Steps are published to and installed from a registry (like npm):
```
pipe install @community/code-review
pipe install @community/test-generator
pipe publish my-custom-step
```

### Manifest
Each step has a `pipe.json` manifest:
```json
{
  "name": "code-review",
  "version": "1.0.0",
  "description": "Reviews code for bugs, style, and security issues",
  "author": "vatsal",
  "input": "text",
  "output": "text",
  "engine": "node",
  "main": "index.js",
  "config": {
    "model": {
      "type": "string",
      "default": "anthropic/claude-sonnet-4-6",
      "description": "Model to use for review"
    },
    "severity": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "default": "medium"
    }
  }
}
```

---

## Architecture

```
agent-pipe/
├── packages/
│   ├── cli/                  # Main CLI (`pipe` command)
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point, command routing
│   │   │   ├── commands/
│   │   │   │   ├── run.ts    # Execute a step (pipe <step>)
│   │   │   │   ├── install.ts # Install a step from registry
│   │   │   │   ├── publish.ts # Publish a step to registry
│   │   │   │   ├── save.ts   # Save a pipeline
│   │   │   │   ├── list.ts   # List installed steps
│   │   │   │   └── init.ts   # Scaffold a new step
│   │   │   ├── runtime/
│   │   │   │   ├── executor.ts    # Step execution engine
│   │   │   │   ├── stream.ts      # Stdin/stdout streaming
│   │   │   │   └── config.ts      # Step config resolution
│   │   │   └── registry/
│   │   │       ├── client.ts      # Registry API client
│   │   │       └── auth.ts        # Registry auth
│   │   └── package.json
│   │
│   ├── steps/                # Built-in steps
│   │   ├── claude/           # pipe claude
│   │   ├── openai/           # pipe openai
│   │   ├── gemini/           # pipe gemini
│   │   ├── local/            # pipe local (ollama/llama.cpp)
│   │   ├── summarize/        # pipe summarize
│   │   ├── format/           # pipe format (md, json, csv)
│   │   └── filter/           # pipe filter (grep-like for AI)
│   │
│   └── create-step/          # Step scaffolding template
│       ├── template/
│       └── package.json
│
├── registry/                 # Registry server (future, phase 2)
│   └── ...
│
├── docs/
├── CLAUDE.md
└── package.json              # Monorepo root (turborepo)
```

---

## CLI Commands

### Core

| Command | Description | Example |
|---------|-------------|---------|
| `pipe <step>` | Run a step, reading stdin | `echo "hello" \| pipe claude` |
| `pipe <step> --config key=val` | Run with config overrides | `pipe claude --config model=gpt-5.4` |
| `pipe run <pipeline>` | Run a saved pipeline | `pipe run my-review-pipeline` |
| `pipe save <name> "<pipeline>"` | Save a pipeline | `pipe save review "pipe claude --config system='review code'"` |

### Step Management

| Command | Description |
|---------|-------------|
| `pipe install <step>` | Install a step from the registry |
| `pipe publish` | Publish current directory as a step |
| `pipe list` | List installed steps |
| `pipe init` | Scaffold a new step |
| `pipe info <step>` | Show step details and config options |

### Utility

| Command | Description |
|---------|-------------|
| `pipe --help` | Show help |
| `pipe --version` | Show version |
| `pipe doctor` | Check installation and dependencies |

---

## Built-in Steps (Phase 1)

### `pipe claude`
Sends stdin to Claude (via AI SDK / direct API). Supports:
- `--config model=<model>` (default: `anthropic/claude-sonnet-4-6`)
- `--config system="<system prompt>"`
- `--config max-tokens=<n>`
- Streams response to stdout as it arrives

### `pipe openai`
Same interface, routes to OpenAI models.

### `pipe gemini`
Same interface, routes to Google models.

### `pipe local`
Routes to local model via Ollama or llama.cpp. Auto-detects which is available.
- `--config model=<model>` (default: auto-detect best available)

### `pipe summarize`
Summarizes input text. Uses the cheapest available model.
- `--config length=<short|medium|long>`
- `--config style=<bullets|prose|technical>`

### `pipe format`
Formats input into specified format.
- `--config format=<md|json|csv|yaml|html>`

### `pipe filter`
AI-powered grep. Filters input based on semantic criteria.
- `--config query="<what to filter for>"`
- `--config invert=<true|false>`

---

## Data Flow Contract

Steps communicate through stdin/stdout using a simple contract:

1. **Text mode (default):** Plain text in, plain text out. The simplest case.
2. **JSON mode:** Structured data. Steps can read/write JSON when `--json` flag is set.
3. **Streaming:** Steps should stream output as it becomes available (not buffer everything).

**Metadata passing:** Pipeline metadata (model used, tokens consumed, latency) is passed via stderr as JSON-lines prefixed with `[pipe:meta]`:
```
[pipe:meta] {"step":"claude","model":"claude-sonnet-4-6","tokens":{"input":150,"output":423},"latency_ms":1200}
```

This keeps stdout clean for piping while allowing observability.

---

## Configuration

### Global config (`~/.pipe/config.json`)
```json
{
  "default_model": "anthropic/claude-sonnet-4-6",
  "api_keys": {
    "anthropic": "sk-...",
    "openai": "sk-...",
    "google": "..."
  },
  "registry": "https://registry.agentpipe.dev",
  "telemetry": false
}
```

### Step-level config
Each step's `pipe.json` defines configurable options. Users override via `--config key=value`.

### Pipeline-level config
Saved pipelines can include default configs:
```json
{
  "name": "code-review",
  "steps": [
    { "step": "claude", "config": { "system": "You are a senior code reviewer..." } },
    { "step": "format", "config": { "format": "md" } }
  ]
}
```

---

## Technical Decisions

### Language: TypeScript (Node.js)
- Largest ecosystem for CLI tools
- AI SDK integration is native
- npm distribution is trivial (`npx pipe`)
- Steps can be any language (the CLI just orchestrates)

### Build: Turborepo monorepo
- CLI + built-in steps + create-step template
- Shared TypeScript config and utilities

### AI SDK Integration
- Built-in steps use Vercel AI SDK for model calls
- Supports all AI SDK providers out of the box
- Streaming by default

### Step Isolation
- Each step runs as a child process
- Steps can't interfere with each other
- Crash in one step doesn't take down the pipeline (broken pipe semantics)

---

## Phases

### Phase 1: Core CLI + Built-in Steps (2-3 weeks)
- `pipe` CLI with `run`, `save`, `list`, `init` commands
- Built-in steps: `claude`, `openai`, `gemini`, `local`, `summarize`, `format`, `filter`
- Global config management
- `npx pipe` distribution
- Documentation site

### Phase 2: Registry + Community Steps (2-3 weeks)
- Step registry (publish, install, search)
- `pipe install` / `pipe publish`
- Web UI for browsing steps
- Verified publisher badges

### Phase 3: Squeeze Integration (1-2 weeks)
- `pipe squeeze` step that compresses context via DeepSeek-OCR technique
- Automatic cost tracking (show savings)
- Configurable compression level

### Phase 4: TinyForge Integration (2-3 weeks)
- `pipe forge train` -- create TinyLoRA adapter from examples
- `pipe forge apply <adapter>` -- apply adapter before model call
- Adapter registry integrated with step registry

### Phase 5: Arena (2-3 weeks)
- `pipe arena submit <pipeline> --challenge <id>` -- submit pipeline to competition
- `pipe arena browse` -- browse challenges
- Leaderboard API + web UI
- Community challenge creation

---

## Success Metrics

- **Week 1:** Working CLI with `pipe claude` end-to-end
- **Week 2:** All built-in steps, save/run pipelines, npm published
- **Month 1:** 100+ GitHub stars, 10+ community steps
- **Month 3:** 1,000+ GitHub stars, registry live, Squeeze integrated
- **Month 6:** 5,000+ stars, Arena launched, TinyForge integrated

---

## Competition & Differentiation

| Competitor | How We Differ |
|-----------|---------------|
| LangChain | Agent Pipe has zero abstraction overhead. No classes, no chains, no memory objects. Just stdin/stdout. |
| LangGraph | We don't require learning a graph DSL. Pipes are the DSL. |
| CrewAI | We don't impose role-based agent patterns. Steps are general-purpose. |
| Mastra | We're not a framework -- we're a composition primitive. Use Mastra as a step if you want. |
| Shell scripts | We add AI-native steps, a registry, and pipeline saving/sharing. |

---

## Open Questions

1. **Registry hosting:** Self-hosted vs. npm-adjacent vs. custom registry?
2. **Authentication:** How do users authenticate with the registry? GitHub OAuth?
3. **Pricing:** Is the registry free forever, or freemium for private steps?
4. **Binary steps:** Should we support compiled binary steps (Rust, Go) with a standard interface?
5. **Parallel fan-out:** Should `pipe scatter` support running multiple steps in parallel on the same input?
