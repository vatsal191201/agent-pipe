# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Agent Pipe -- "The Unix philosophy for AI agents." A CLI that chains AI agents via Unix pipes.

## Commands

- Build: `npx tsup`
- Test all: `npx vitest run`
- Test single: `npx vitest run tests/path/to/test.ts`
- Test watch: `npx vitest`
- Type check: `npx tsc --noEmit`
- Run locally: `echo "input" | node dist/index.js <step>`

## Architecture

Single TypeScript ESM package. CLI via Commander.js. 78 tests across 15 files.

- `src/index.ts` -- CLI entry, command routing
- `src/commands/` -- run-step (default), list, save, run-pipeline, compare, cost, config-cmd, info
- `src/runtime/` -- stdin reader, stderr metadata emitter (`[pipe:meta]`), config system (~/.pipe/config.json)
- `src/steps/` -- 10 step implementations + registry + shared utilities
  - Provider steps: claude, openai, gemini, local (Ollama)
  - Universal step: llm (routes `provider/model` strings to any provider)
  - Smart steps: summarize, translate, extract, filter (use `resolveCheapestModel()` -- Anthropic → OpenAI → Gemini → Ollama fallback)
  - Transform step: format (pure data, no LLM)
  - `cheapest-model.ts` -- shared `resolveCheapestModel()` and `parseMaxTokens()`

### Step Contract

Steps are async generators: `yield` strings (streamed to stdout), `return` a `PipeMeta` object (emitted to stderr). This keeps stdout clean for piping.

### Config Resolution

API keys resolve: config file first, then env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`).

### AI SDK Usage

Standalone CLI -- uses direct provider SDKs (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`) with `streamText` from `ai` (Vercel AI SDK v6). Not deployed on Vercel, no AI Gateway.

## Conventions

- All LLM steps stream via async generators
- Tests mock AI SDK with `vi.mock("ai", ...)` and `vi.mock("@ai-sdk/...", ...)`
- Metadata goes to stderr via `emitMeta()`, never stdout
- Step names are lowercase single words
- New LLM-based steps should use `resolveCheapestModel()` from `cheapest-model.ts`
- Validate `max-tokens` with `parseMaxTokens()` from `cheapest-model.ts`
- Provider steps should only use `default_model` if prefix matches their provider
