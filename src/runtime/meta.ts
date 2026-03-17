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
