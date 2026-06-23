# aevatar-platform-map

> Panorama, entry point, and catalog for the whole Aevatar skill collection driven over its REST API. Load this FIRST whenever a user wants to build, publish, schedule, or operate things on Aevatar — "create an agent team", "make a workflow / member", "publish/bind a service", "register it with NyxID", "set up a recurring/scheduled run", "deploy an agent", "invoke my service" — or just wants to know what aevatar skills exist. It teaches the object model (scope → team → member(workflow/script/gagent) → service → schedule), how to authenticate with a NyxID token, how to resolve your scope, and indexes every member of the aevatar skill family (control-plane + authoring + diagnostics + safety-net), all held together by the shared `aevatar` tag. It does not perform the work itself — it routes you to the right companion skill.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-platform-map) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.1`
- Last synced: `2026-06-23T05:42:38.014Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-platform-map
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
