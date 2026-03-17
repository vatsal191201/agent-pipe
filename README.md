# Agent Pipe

> The Unix philosophy for AI agents

Chain AI agents together using Unix pipes. Each step reads stdin, processes, writes stdout.

```bash
echo "What is quantum computing?" | pipe claude
echo "Review this code for bugs" | pipe claude | pipe summarize
cat data.csv | pipe claude -c system="Analyze this data" | pipe format -c format=json
```

## Install

```bash
npm install -g agent-pipe
```

Or run directly:

```bash
echo "hello" | npx agent-pipe claude
```

## Usage

```bash
# Ask Claude a question
echo "What is quantum computing?" | pipe claude

# Use a system prompt
echo "Review this code" | pipe claude -c system="You are a senior code reviewer"

# Chain steps
echo "Explain relativity in detail" | pipe claude | pipe summarize -c length=short

# Format output as JSON
echo "List 5 startup ideas" | pipe claude | pipe format -c format=json

# Use OpenAI instead
echo "Hello" | pipe openai -c model=gpt-5.4

# Save and reuse pipelines
pipe save review "pipe claude -c system='You are a code reviewer' | pipe format -c format=md"
pipe run review < my-code.py
```

## Configuration

```bash
# Set API keys via environment variables
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

Or create `~/.pipe/config.json`:

```json
{
  "default_model": "anthropic/claude-sonnet-4-6",
  "api_keys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-..."
  }
}
```

## Available Steps

```bash
pipe list
```

| Step | Description |
|------|-------------|
| `claude` | Send input to Claude and stream the response |
| `openai` | Send input to OpenAI and stream the response |
| `summarize` | Summarize text (uses cheapest available model) |
| `format` | Format output (md, json, csv) |

## Metadata

Each step emits metadata to stderr as `[pipe:meta]` JSON-lines:

```
[pipe:meta] {"step":"claude","model":"claude-sonnet-4-6","tokens":{"input":10,"output":50},"latency_ms":1200}
```

This keeps stdout clean for piping while enabling observability. Redirect stderr to see it:

```bash
echo "hello" | pipe claude 2>meta.jsonl
```

## License

MIT
