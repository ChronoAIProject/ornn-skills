# aevatar-triage

> Use AFTER something goes wrong while using Aevatar — a user hits an error, failure, or confusing behavior and you must find whether it lives in Aevatar, NyxID, or Ornn, then act. Triggers - "aevatar is erroring", "why did my workflow fail", "my bot does not reply", "connector 401/403", "skill will not pull or upload", "is this an aevatar, nyxid, or ornn bug", "file an issue", "am I using this right". It makes you attribute the failure to the right layer by tracing the request path, pull that layer's real public source for a code-grounded root cause citing file and line, then branch - draft and, only on explicit user confirmation, file a precise GitHub issue when behavior violates the layer's published contract, or explain the correct usage from the code when it is a usage mistake. The after-it-breaks counterpart to aevatar-feasibility-advisor; never auto-files, de-dups first, never claims a root cause without a code citation. Works locally (git + gh) and server-side (nyxid_proxy + api-github).

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-triage) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.0`
- Last synced: `2026-06-28T16:00:00.921Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-triage
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
