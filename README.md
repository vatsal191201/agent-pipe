# Agent Pipe

> The Unix philosophy for AI agents

Chain AI agents together using Unix pipes. Each step reads stdin, processes, writes stdout. No frameworks, no YAML, no orchestration config -- just pipes.

```bash
echo "Review this code for bugs" | pipe claude | pipe summarize
cat error.log | pipe openai -c system="Explain these errors" | pipe format -c format=json
git diff | pipe llm -c model=anthropic/claude-sonnet-4-6 -c system="Write a commit message"
```

## Why

Every AI framework wants you to learn its abstractions -- chains, graphs, crews, workflows. Agent Pipe doesn't. If you know how Unix pipes work, you already know how to use it.

- **Composable** -- chain any steps with `|`, just like `grep | sed | awk`
- **Streaming** -- responses stream token-by-token, not buffered
- **Provider agnostic** -- Claude, OpenAI, Gemini, Ollama, or any provider via `pipe llm`
- **Observable** -- every step emits token counts, latency, and cost to stderr
- **Extensible** -- steps are just async generator functions

## Install

```bash
npm install -g agent-pipe
```

Or run directly with npx:

```bash
echo "hello" | npx agent-pipe claude
```

## Quick Start

```bash
# Set your API key (any one works)
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...
# or
export GOOGLE_GENERATIVE_AI_API_KEY=...
# or just use Ollama (no key needed): ollama serve

# Ask a question
echo "What is quantum computing?" | pipe openai

# Use any provider via the universal step
echo "hello" | pipe llm -c model=anthropic/claude-haiku-4-5
echo "hello" | pipe llm -c model=ollama/llama3.2

# Chain steps
echo "Explain relativity in detail" | pipe openai | pipe summarize -c length=short

# Translate
echo "Hello, how are you?" | pipe translate -c lang=ja

# Extract structured info
echo "Meeting at 3pm, John presents Q1, budget due Friday" | pipe extract -c query="action items"

# AI-powered grep
git log --oneline -20 | pipe filter -c query="bug fixes"
```

## Available Steps

| Step | Description | Requires |
|------|-------------|----------|
| `llm` | **Universal** -- route to any provider/model | Any key |
| `claude` | Send to Claude | `ANTHROPIC_API_KEY` |
| `openai` | Send to OpenAI | `OPENAI_API_KEY` |
| `gemini` | Send to Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `local` | Send to Ollama (local models) | Ollama running |
| `summarize` | Summarize text | Any key (or Ollama) |
| `translate` | Translate to any language | Any key (or Ollama) |
| `extract` | Extract specific content | Any key (or Ollama) |
| `filter` | AI-powered grep | Any key (or Ollama) |
| `format` | Convert to JSON/CSV/MD | None |

```bash
pipe list           # Show all steps
pipe info <step>    # Show step details and config options
```

## Commands

| Command | Description |
|---------|-------------|
| `pipe <step>` | Run a step (reads from stdin) |
| `pipe <step> -c key=value` | Run with config overrides |
| `pipe list` | List available steps |
| `pipe info <step>` | Show step config options |
| `pipe compare <models...>` | Compare models side-by-side |
| `pipe cost` | Analyze pipeline cost from metadata |
| `pipe config set/get/list` | Manage configuration |
| `pipe save <name> <def>` | Save a pipeline |
| `pipe run <name>` | Run a saved pipeline |

## Universal Model Routing

The `llm` step accepts any `provider/model` string:

```bash
echo "hello" | pipe llm -c model=anthropic/claude-haiku-4-5
echo "hello" | pipe llm -c model=openai/gpt-4.1-mini
echo "hello" | pipe llm -c model=google/gemini-2.5-flash
echo "hello" | pipe llm -c model=ollama/llama3.2
```

Supported providers: `anthropic`, `openai`, `google`, `ollama` (or `local`).

## Model Comparison

Compare multiple models on the same input:

```bash
echo "Explain recursion in one sentence" | pipe compare openai/gpt-4.1-mini anthropic/claude-haiku-4-5
```

Output:
```
═══ openai/gpt-4.1-mini (234ms, 12→28 tokens) ═══
Recursion is when a function calls itself...

═══ anthropic/claude-haiku-4-5 (567ms, 12→35 tokens) ═══
Recursion is a programming technique...

═══ Summary ═══
┌──────────────────────────────┬────────┬────────┬────────┐
│ Model                        │ Input  │ Output │ Time   │
├──────────────────────────────┼────────┼────────┼────────┤
│ openai/gpt-4.1-mini         │ 12     │ 28     │ 234ms  │
│ anthropic/claude-haiku-4-5   │ 12     │ 35     │ 567ms  │
└──────────────────────────────┴────────┴────────┴────────┘
```

## Cost Tracking

Analyze pipeline costs from `[pipe:meta]` metadata:

```bash
# Capture metadata, then analyze
echo "hello" | pipe openai | pipe summarize 2>meta.log
pipe cost < meta.log
```

Output:
```
Pipeline Cost Summary
────────────────────────────────────────────────────────────
  openai       gpt-4.1          10→50 tokens  500ms  $0.000420
  summarize    gpt-4.1-mini     60→25 tokens  300ms  $0.000064
────────────────────────────────────────────────────────────
  Total: 70→75 tokens  800ms  $0.000484
```

## Use Cases

### Code review
```bash
git diff | pipe claude -c system="Review for bugs, security issues, and style"
```

### Translate and summarize
```bash
cat article-en.md | pipe translate -c lang=ja | pipe summarize -c length=short
```

### Extract action items from meetings
```bash
cat meeting-notes.txt | pipe extract -c query="action items and deadlines"
```

### Filter git history
```bash
git log --oneline -50 | pipe filter -c query="bug fixes"
```

### Compare models for a task
```bash
cat prompt.txt | pipe compare openai/gpt-4.1 anthropic/claude-sonnet-4-6 google/gemini-2.5-flash
```

### Reusable pipelines
```bash
pipe save code-review "pipe claude -c system='Senior code reviewer. Be concise. Flag bugs only.'"
git diff | pipe run code-review
```

### Shell scripts
```bash
#!/bin/bash
TEST_OUTPUT=$(npm test 2>&1)
echo "$TEST_OUTPUT" | pipe openai -c system="Analyze failures, suggest fixes" > report.md
```

## Configuration

### API keys (environment variables)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Config file

```bash
pipe config set api_keys.anthropic sk-ant-...
pipe config set default_model anthropic/claude-sonnet-4-6
pipe config list
```

### Per-step overrides

```bash
pipe claude -c model=claude-haiku-4-5 -c max-tokens=100 -c system="Be brief"
pipe llm -c model=ollama/deepseek-coder -c system="You are a code assistant"
```

## Observability

Every step emits metadata to stderr:

```
[pipe:meta] {"step":"openai","model":"gpt-4.1","tokens":{"input":14,"output":8},"latency_ms":1961}
```

Stdout stays clean for piping. Capture metadata separately:

```bash
echo "hello" | pipe claude 2>meta.jsonl    # metadata to file
echo "hello" | pipe claude 2>/dev/null     # suppress metadata
```

## Architecture

```
stdin → [step A] → stdout/stdin → [step B] → stdout/stdin → [step C] → stdout
                ↘ stderr: [pipe:meta]    ↘ stderr: [pipe:meta]
```

Steps are async generators: `yield` text chunks (→ stdout), `return` metadata (→ stderr). Same contract as Unix filters.

**Smart steps** (summarize, translate, extract, filter) auto-detect the cheapest available provider: Anthropic → OpenAI → Gemini → Ollama (local, no key needed).

## Roadmap

- **v0.2** (current) -- 10 steps, universal routing, model comparison, cost tracking
- **v0.3** -- Step registry: `pipe install @community/code-review`, `pipe publish`
- **v0.4** -- Squeeze: 10x cheaper API calls via text-to-image compression
- **v0.5** -- TinyForge: 26-byte model adapters shareable as URLs
- **v0.6** -- Arena: competitive pipeline scoring and leaderboards

## Development

```bash
npm install          # Install dependencies
npm run build        # Build with tsup
npm test             # Run 78 tests (vitest)
npm run lint         # Type check (tsc --noEmit)
```

## License

MIT
