# aevatar-triage

> Use AFTER something goes wrong while using Aevatar — a user hits an error, failure, or confusing behavior and you must find whether it lives in Aevatar, NyxID, or Ornn, then act. Triggers - "aevatar is erroring", "why did my workflow fail", "my scheduled run did not fire", "my bot does not reply", "connector 401/403", "skill won't pull/upload", "is this an aevatar, nyxid, or ornn bug", "file an issue", "am I using this right". It attributes the failure by tracing the request path, pulls that layer's real public source for a code-grounded root cause citing file and line, then branches - draft and, only on explicit user confirmation, file a precise GitHub issue when behavior violates the layer's published contract, or explain the correct usage from the code when it is a usage mistake. The after-it-breaks counterpart to aevatar-feasibility-advisor; never auto-files, de-dups first, never claims a root cause without a code citation. Works locally (git + gh) and server-side (nyxid_proxy + api-github).

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-triage) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.2`
- Last synced: `2026-06-30T11:00:01.403Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-triage
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
