# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Agent Pipe -- "The Unix philosophy for AI agents." A CLI tool that chains AI agents together using Unix pipes. `echo "hello" | pipe claude | pipe summarize`

## Commands

- Build: `npx tsup`
- Test all: `npx vitest run`
- Test single: `npx vitest run tests/path/to/test.ts`
- Test watch: `npx vitest`
- Type check: `npx tsc --noEmit`
- Run locally: `echo "input" | node dist/index.js <step>`

## Architecture

Single TypeScript package. CLI built with Commander.js. ESM-only (`"type": "module"`).

- `src/index.ts` -- CLI entry point, command routing via Commander
- `src/commands/` -- Command handlers: run-step (default), list, save, run-pipeline
- `src/runtime/` -- Core utilities: stdin reader, stderr metadata emitter, config system (~/.pipe/config.json)
- `src/steps/` -- Step implementations + registry. Each step is a `StepDefinition` with an async generator `run` function.

### Step Contract

Steps are async generators: `yield` strings (streamed to stdout), `return` a `PipeMeta` object (emitted to stderr as `[pipe:meta]` JSON-lines). This keeps stdout clean for piping.

### Config Resolution

API keys resolve: config file (`~/.pipe/config.json`) first, then environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc).

### AI SDK Usage

This is a standalone CLI -- uses direct provider SDKs (`@ai-sdk/anthropic`, `@ai-sdk/openai`) with `streamText` from `ai` (Vercel AI SDK v6). Not deployed on Vercel, no AI Gateway.

## Conventions

- All LLM steps stream output via async generators
- Tests use vitest with `vi.mock()` for AI SDK calls
- Metadata goes to stderr via `emitMeta()`, never stdout
- Step names are lowercase, single-word (e.g., `claude`, `summarize`, `format`)
