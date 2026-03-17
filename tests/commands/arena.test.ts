import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  arenaCreate,
  arenaAddCase,
  arenaLeaderboard,
  arenaList,
  jaccardSimilarity,
  loadChallenge,
  saveChallenge,
} from "../../src/commands/arena.js";

describe("arena", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pipe-arena-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("jaccardSimilarity", () => {
    it("returns 1 for identical strings", () => {
      expect(jaccardSimilarity("hello world", "hello world")).toBe(1);
    });

    it("returns 0 for completely different strings", () => {
      expect(jaccardSimilarity("hello world", "foo bar")).toBe(0);
    });

    it("returns partial similarity for overlapping words", () => {
      const score = jaccardSimilarity("the cat sat on the mat", "the dog sat on the rug");
      // Words: {the, cat, sat, on, mat} vs {the, dog, sat, on, rug}
      // Intersection: {the, sat, on} = 3
      // Union: {the, cat, sat, on, mat, dog, rug} = 7
      expect(score).toBeCloseTo(3 / 7, 5);
    });

    it("is case insensitive", () => {
      expect(jaccardSimilarity("Hello World", "hello world")).toBe(1);
    });

    it("returns 1 for two empty strings", () => {
      expect(jaccardSimilarity("", "")).toBe(1);
    });
  });

  describe("arenaCreate", () => {
    it("creates a challenge file", () => {
      arenaCreate("test-challenge", "A test challenge", tempDir);
      const challenge = loadChallenge("test-challenge", tempDir);
      expect(challenge).toBeDefined();
      expect(challenge!.name).toBe("test-challenge");
      expect(challenge!.description).toBe("A test challenge");
      expect(challenge!.cases).toEqual([]);
      expect(challenge!.runs).toEqual([]);
    });

    it("persists challenge to disk", () => {
      arenaCreate("persist-test", "Testing persistence", tempDir);
      const filePath = join(tempDir, "persist-test.json");
      expect(existsSync(filePath)).toBe(true);
      const raw = JSON.parse(readFileSync(filePath, "utf-8"));
      expect(raw.name).toBe("persist-test");
    });
  });

  describe("arenaAddCase", () => {
    it("adds a test case to existing challenge", () => {
      arenaCreate("add-test", "Test adding cases", tempDir);
      arenaAddCase("add-test", "input text", "expected output", tempDir);

      const challenge = loadChallenge("add-test", tempDir);
      expect(challenge!.cases).toHaveLength(1);
      expect(challenge!.cases[0]).toMatchObject({
        id: "case-1",
        input: "input text",
        expected: "expected output",
      });
    });

    it("increments case IDs", () => {
      arenaCreate("multi-case", "Multiple cases", tempDir);
      arenaAddCase("multi-case", "input1", "expected1", tempDir);
      arenaAddCase("multi-case", "input2", "expected2", tempDir);

      const challenge = loadChallenge("multi-case", tempDir);
      expect(challenge!.cases).toHaveLength(2);
      expect(challenge!.cases[0].id).toBe("case-1");
      expect(challenge!.cases[1].id).toBe("case-2");
    });
  });

  describe("arenaLeaderboard", () => {
    it("outputs message when no runs exist", () => {
      arenaCreate("empty-board", "No runs yet", tempDir);

      const output: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => output.push(args.join(" "));

      arenaLeaderboard("empty-board", tempDir);

      console.log = origLog;
      expect(output.join("\n")).toContain("No runs yet");
    });

    it("shows leaderboard for challenge with runs", () => {
      arenaCreate("scored", "Scored challenge", tempDir);
      const challenge = loadChallenge("scored", tempDir)!;
      challenge.runs.push({
        pipeline: "pipe openai",
        timestamp: new Date().toISOString(),
        scores: [{ caseId: "case-1", similarity: 0.85, output: "test" }],
        avgScore: 0.85,
        totalTokens: 150,
        totalLatency: 2000,
      });
      saveChallenge(challenge, tempDir);

      const output: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => output.push(args.join(" "));

      arenaLeaderboard("scored", tempDir);

      console.log = origLog;
      const joined = output.join("\n");
      expect(joined).toContain("Leaderboard");
      expect(joined).toContain("pipe openai");
      expect(joined).toContain("85%");
    });
  });

  describe("arenaList", () => {
    it("shows message when no challenges exist", () => {
      const output: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => output.push(args.join(" "));

      arenaList(tempDir);

      console.log = origLog;
      expect(output.join("\n")).toContain("No challenges yet");
    });

    it("lists existing challenges", () => {
      arenaCreate("challenge-a", "First challenge", tempDir);
      arenaCreate("challenge-b", "Second challenge", tempDir);

      const output: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => output.push(args.join(" "));

      arenaList(tempDir);

      console.log = origLog;
      const joined = output.join("\n");
      expect(joined).toContain("challenge-a");
      expect(joined).toContain("challenge-b");
    });
  });

  describe("persistence", () => {
    it("save and load round-trips correctly", () => {
      arenaCreate("roundtrip", "Round trip test", tempDir);
      arenaAddCase("roundtrip", "hello", "world", tempDir);

      const loaded = loadChallenge("roundtrip", tempDir);
      expect(loaded).toBeDefined();
      expect(loaded!.name).toBe("roundtrip");
      expect(loaded!.cases).toHaveLength(1);
      expect(loaded!.cases[0].input).toBe("hello");
      expect(loaded!.cases[0].expected).toBe("world");
    });
  });
});
