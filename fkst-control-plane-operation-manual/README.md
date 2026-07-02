# fkst-control-plane-operation-manual

> Operational manual for an AI agent driving the fkst CONTROL PLANE (fkst-control-plane) over its HTTP API, exclusively through the NyxID CLI credential proxy (`nyxid proxy request …`). Covers the five core user flows — create a GitHub repo under my account, bootstrap a repo's `.fkst/` directory, trigger a fkst-substrate session with my input arguments, check the status of all my substrate sessions, and stop/terminate a specific session — with the EXACT request body and response shape for every call so the agent never has to guess. Invoke when the user says "create a repo via the control plane", "bootstrap .fkst", "trigger a substrate session", "start/stop a fkst session", "check my sessions", or "drive the fkst control plane through nyxid".

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/fkst-control-plane-operation-manual) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `0.1`
- Last synced: `2026-07-02T08:00:03.350Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/fkst-control-plane-operation-manual
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
