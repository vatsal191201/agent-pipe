# Agent-First Product Ideas -- Complete Catalog

**Date:** 2026-03-17
**Status:** Brainstorming complete. Selected: Agent Pipe (Approach A -- pipe as platform, others as plugins).

---

## Research Sources

Research gathered from: arxiv (Jan-Mar 2026), bycloud.ai newsletters, Product Hunt, GitHub Trending, Hacker News, X/Twitter, Reddit (r/ClaudeAI, r/LocalLLaMA, r/MachineLearning).

Key papers informing these ideas:
- TinyLoRA (Meta, Feb 2026) -- arxiv:2602.04118
- Doc-to-LoRA (Mar 2026) -- hypernetwork document compression
- DeepSeek-OCR (Oct 2025) -- text-to-image compression
- Drifting Models (MIT/Harvard, Feb 2026) -- single-step image generation
- Attention Residuals (Kimi/MoonshotAI, Mar 2026) -- arxiv:2603.15031
- WebMCP (Google/Microsoft, Feb 2026) -- W3C agent-website protocol
- CosyVoice2 (0.5B params) -- zero-shot voice cloning
- FlashAttention-4 (Mar 2026) -- arxiv:2603.05451
- TRM: Tiny Recursive Models (Samsung, Oct 2025) -- arxiv:2510.04871
- RLM / Slate V1 (Random Labs) -- swarm-native coding agents

---

## Selected Ideas (Building)

### 1. Agent Pipe ★ SELECTED -- Building First
**Tagline:** "The Unix philosophy for AI agents"

Chain agents with `|`. Each step reads stdin, writes stdout. No frameworks, no YAML.

```
echo "review this PR" | pipe claude | pipe summarize | pipe slack-post
```

- **Research basis:** Unix composition model applied to AI agents. No direct paper -- this is a design paradigm.
- **Build complexity:** Low (CLI + step runtime)
- **Time to MVP:** 1-2 weeks
- **Revenue:** Open-source core. Marketplace for paid community steps. Enterprise private registries.
- **Virality:** High -- developers share pipelines like shell one-liners.
- **Why first:** Simplest to build. The other 3 ideas become steps/plugins in Agent Pipe.

### 2. TinyForge (Phase 4 plugin)
**Tagline:** "npm for AI model behaviors"

Create/share/apply 26-byte model adapters. Adapters shareable as URLs.

```
npx tinyforge train --data examples.jsonl
npx tinyforge publish legal-writing-v2
npx tinyforge apply tinyforge.dev/vatsal/legal-v2
```

- **Research basis:** TinyLoRA (Meta, Feb 2026). 13 trainable params = 26 bytes. 91% on GSM8K. 90% of full fine-tuning with 1000x fewer params.
- **Build complexity:** Low-medium (CLI + web registry)
- **Time to MVP:** 2-3 weeks
- **Revenue:** Freemium marketplace (free publish, paid private adapters/teams/analytics)
- **Virality:** Very high -- adapters shared as URLs on X, Reddit, Discord
- **As Agent Pipe step:** `pipe forge-apply legal-v2 | pipe claude`

### 3. Squeeze (Phase 3 plugin)
**Tagline:** "10x cheaper LLM API calls"

Transparent proxy that compresses text into images before sending to LLM APIs.

```
npx squeeze start --port 8080
# Point API calls at localhost:8080 instead of api.openai.com
```

- **Research basis:** DeepSeek-OCR (Oct 2025). Text compressed into images at 10x compression, 97% decoding precision.
- **Build complexity:** Medium (proxy server, image compression pipeline)
- **Time to MVP:** 2-3 weeks
- **Revenue:** Usage-based (% of savings) or flat SaaS
- **Virality:** Medium -- word of mouth from cost savings
- **As Agent Pipe step:** `pipe squeeze | pipe claude` (compress before sending)

### 4. Agent Arena (Phase 5 plugin)
**Tagline:** "Kaggle meets Twitch for AI agents"

Compete agents on community challenges. Live spectating, leaderboards, replays.

```
npx arena register my-agent
npx arena submit --challenge code-review-v2
npx arena watch live
```

- **Research basis:** Agent competition as evolution (Pokemon agent benchmarks, RTS games for agents trending on HN)
- **Build complexity:** Medium-high (sandboxed execution, scoring, streaming)
- **Time to MVP:** 3-4 weeks
- **Revenue:** Free to compete. Sponsored challenges. Prize pools.
- **Virality:** High -- competitions are inherently shareable
- **As Agent Pipe feature:** Submit pipelines to challenges, compare pipeline scores

---

## Explored but Not Selected (Reference)

### 5. AgentReady
**Tagline:** "Make any website agent-friendly with one script tag"

`<script src="agentready.js">` auto-detects forms/buttons and exposes them as structured agent actions (WebMCP-compatible).

- **Research:** WebMCP (Google/Microsoft, Feb 2026), W3C incubation
- **Why not selected:** Standards race risk -- Google may build the official toolkit. B2B sales cycle.

### 6. DocBrain
**Tagline:** "Upload a PDF, get an instant queryable brain"

Hypernetwork reads document once, generates LoRA adapter. Query forever at zero marginal cost.

- **Research:** Doc-to-LoRA (Mar 2026)
- **Why not selected:** Requires training/hosting the hypernetwork. Higher infrastructure cost. Enterprise sales cycle.

### 7. DepthForge
**Tagline:** "1.25x free compute for any LLM training run"

Drop-in library replacing residual connections with Block Attention Residuals.

- **Research:** Attention Residuals (Kimi/MoonshotAI, Mar 2026, arxiv:2603.15031)
- **Why not selected:** Niche market (AI labs training foundation models). Requires deep training framework integration.

### 8. Vox
**Tagline:** "Dub any video in any language with the original voice"

Upload video → pick language → dubbed in speaker's original voice. Runs locally.

- **Research:** CosyVoice2 (0.5B params, 150ms), IndexTTS-2
- **Why not selected:** Pipeline complexity (STT → translate → TTS → sync). Competitive market.

### 9. Drift
**Tagline:** "Images at the speed of thought"

Real-time image generation in a single forward pass. No iterative diffusion.

- **Research:** Drifting Models (MIT/Harvard, Feb 2026)
- **Why not selected:** Requires training the model. High GPU infrastructure cost.

### 10. Agent Ghost
**Tagline:** "Show me once, I'll do it forever"

Record yourself doing a task → behavioral cloning → agent replicates your workflow.

- **Research:** Novel interaction paradigm (no specific paper)
- **Why not selected:** High build complexity (screen understanding, action extraction, pattern recognition).

### 11. Agent Cast
**Tagline:** "Twitch for AI"

Live-stream agent work with reasoning traces and real-time annotations.

- **Research:** Developer streaming culture + agent observability gap
- **Why not selected:** Entertainment product, harder to monetize. Could be a feature of Arena.

### 12. Agent Diff
**Tagline:** "Which AI is better at X? Now you know."

Compare two agents on the same task side-by-side. Scoring on quality, speed, cost.

- **Research:** No direct paper -- product gap
- **Why not selected:** Niche. Could be a feature of Arena.

### 13. Agent Drops
**Tagline:** "Wake up to what your agent made"

Agents create things overnight, deliver to your inbox. Set a vibe, get artifacts.

- **Research:** "Agents that run while I sleep" (428pts HN)
- **Why not selected:** Hard to define quality. Serendipity is difficult to productize.

### 14. Agent Pulse
**Tagline:** "Datadog for agent behavior"

One-line observability for any agent. Behavioral fingerprints, drift detection, cost tracking.

- **Research:** Agent observability gap, safety reckoning (26% of agent skills have vulns)
- **Why not selected:** Crowded observability market. Could be metadata layer in Agent Pipe (stderr metadata).

---

## Research Landscape Summary

### What's Hot (Mar 2026)
- Protocol stack crystallizing: MCP + A2A + AG-UI + x402 + AGENTS.md (all under Linux Foundation AAIF)
- Agent identity: KYA (Know Your Agent) from Skyfire, Visa TAP, Mastercard protocols
- Agent payments: x402 (HTTP 402 for stablecoin micropayments)
- Memory revolution: Biomimetic (Hindsight), Observational (Mastra), Dopamine-gated (D-MEM)
- Self-evolving agents: Darwin Godel Machine (20% → 50% SWE-bench)
- Collective intelligence paradox: Smarter individual agents → worse collective outcomes
- Agent infrastructure category: Agent-specific email, maps, credentials, scheduling

### GitHub Trending (Mar 17, 2026)
- Superpowers: 89k stars (agent skills/methodology)
- MiroFish: +3,260 stars/day (multi-agent swarm prediction)
- OpenViking (ByteDance): +2,012/day (context database for agents)
- GitNexus: +1,860/day (client-side knowledge graphs)
- claude-mem: 37k stars (persistent agent memory)

### Key Insight
Developers want **less capability, more reliability**. Narrow, predictable agents that do fewer things well. The Unix philosophy -- small, composable, focused tools -- is the right paradigm for the agent era.
