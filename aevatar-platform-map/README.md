# aevatar-platform-map

> Entry point, panorama, and router for the entire Aevatar skill family — load this FIRST whenever someone wants to build, run, publish, schedule, or operate anything on Aevatar ("create an agent team", "make a workflow / member", "publish or bind a service", "register it with NyxID", "set up a recurring / cron run", "invoke my service"), wants to know whether something is even possible ("can Aevatar do X?", "能不能用 aevatar 实现"), or just wants to know what Aevatar can do. It teaches the object model (scope → team → member[workflow|script|gagent] → service → schedule), how to authenticate as a NyxID-bearer REST client, how to resolve your scope, and the two caller modes (client REST vs in-session server-side tools). It does not do the work itself — it routes you to the right companion skill (feasibility-advisor, workflow-authoring, team-builder, service-publisher, scheduler, plus diagnostics probes and the safety-net fallback), held together by the shared `aevatar` tag.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-platform-map) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.4`
- Last synced: `2026-06-25T09:00:01.120Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-platform-map
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
