# Agent Pipe

> The Unix philosophy for AI agents

Chain AI agents together using Unix pipes. Each step reads stdin, processes, writes stdout. No frameworks, no YAML, no orchestration config -- just pipes.

```bash
echo "Review this code for bugs" | pipe claude | pipe summarize
cat error.log | pipe openai -c system="Explain these errors" | pipe format -c format=json
git diff | pipe claude -c system="Write a commit message for this diff"
```

## Why

Every AI framework wants you to learn its abstractions -- chains, graphs, crews, workflows. Agent Pipe doesn't. If you know how Unix pipes work, you already know how to use it.

- **Composable** -- chain any steps with `|`, just like `grep | sed | awk`
- **Streaming** -- responses stream token-by-token, not buffered
- **Provider agnostic** -- same interface for Claude, OpenAI, local models
- **Observable** -- every step emits token counts, latency, and cost to stderr
- **Extensible** -- steps are just functions; community steps coming in Phase 2

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
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...
# or
export OPENAI_API_KEY=sk-...

# Ask a question
echo "What is quantum computing?" | pipe claude

# Chain steps together
echo "Explain relativity in detail" | pipe claude | pipe summarize -c length=short

# Format output as JSON
echo "List 5 startup ideas" | pipe openai | pipe format -c format=json
```

## Use Cases

### Code review from the terminal
```bash
git diff | pipe claude -c system="Review this diff for bugs, security issues, and style"
```

### Analyze logs
```bash
cat error.log | pipe openai -c system="Summarize these errors and suggest fixes"
```

### Multi-step processing
```bash
cat paper.pdf | pipe claude -c system="Extract key findings" | pipe summarize -c style=bullets
```

### Reusable pipelines
```bash
# Save a pipeline
pipe save code-review "pipe claude -c system='Senior code reviewer. Be concise. Flag bugs only.'"

# Use it anytime
git diff | pipe run code-review
cat src/auth.ts | pipe run code-review
```

### Shell script integration
```bash
#!/bin/bash
# In CI: auto-analyze test failures
TEST_OUTPUT=$(npm test 2>&1)
echo "$TEST_OUTPUT" | pipe openai -c system="Analyze failures, suggest fixes" > report.md
```

### Data transformation
```bash
# Convert AI output to structured data
echo "List the top 5 programming languages with their primary use case" \
  | pipe openai \
  | pipe format -c format=json
```

## Available Steps

| Step | Description | Requires API Key |
|------|-------------|-----------------|
| `claude` | Send input to Claude, stream response | `ANTHROPIC_API_KEY` |
| `openai` | Send input to OpenAI, stream response | `OPENAI_API_KEY` |
| `summarize` | Summarize text (uses cheapest model available) | Any key |
| `format` | Format as JSON, CSV, or markdown | None |

```bash
pipe list  # Show all available steps
```

## Configuration

### Environment variables (recommended)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

### Config file

Create `~/.pipe/config.json`:

```json
{
  "default_model": "anthropic/claude-sonnet-4-6",
  "api_keys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-..."
  }
}
```

### Per-step config

Override settings with `-c key=value`:

```bash
pipe claude -c model=claude-haiku-4-5 -c max-tokens=100
pipe openai -c model=gpt-5.4 -c system="You are a poet"
pipe summarize -c length=short -c style=bullets
pipe format -c format=csv
```

## Commands

| Command | Description |
|---------|-------------|
| `pipe <step>` | Run a step (reads from stdin) |
| `pipe <step> -c key=value` | Run with config overrides |
| `pipe list` | List available steps |
| `pipe save <name> <definition>` | Save a pipeline |
| `pipe run <name>` | Run a saved pipeline |
| `pipe --help` | Show help |
| `pipe --version` | Show version |

## Observability

Every step emits metadata to stderr as JSON-lines:

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
                ↘ stderr: [pipe:meta] {...}
```

Steps are async generators that yield text chunks (streamed to stdout) and return metadata (emitted to stderr). This is the same contract as Unix filters -- read stdin, write stdout, log to stderr.

## Roadmap

- **v0.1** (current) -- Core CLI with 4 built-in steps
- **v0.2** -- Step registry: `pipe install @community/code-review`, `pipe publish`
- **v0.3** -- Squeeze: 10x cheaper API calls via text-to-image compression
- **v0.4** -- TinyForge: 26-byte model adapters shareable as URLs
- **v0.5** -- Arena: competitive pipeline scoring and leaderboards

## Development

```bash
npm install          # Install dependencies
npm run build        # Build with tsup
npm test             # Run tests (vitest)
npm run lint         # Type check (tsc --noEmit)
```

## License

MIT
