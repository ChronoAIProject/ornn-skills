# fallback-to-calling-agent

> Universal try-catch fallback for the aevatar model. Use whenever, after a genuine attempt, you cannot complete the user's request with available server-side capabilities — no matching skill/workflow/connector/tool, a terminal failure, or a task that inherently needs the caller's local environment (files, shell, local context). Instead of failing opaquely or fabricating, return the original request verbatim to the calling agent so it can finish with its own local tools. Generic by design — addresses "the calling agent" with no hardcoded client or skill names.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/fallback-to-calling-agent) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.0`
- Last synced: `2026-07-02T10:00:03.333Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/fallback-to-calling-agent
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
