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
