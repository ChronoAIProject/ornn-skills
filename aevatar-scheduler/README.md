# aevatar-scheduler

> Create and manage cron schedules that fire an Aevatar service on a recurring basis, authenticated as the scope owner via NyxID — over the REST API. Use when a user wants to "schedule", "run on a cron", "set up a recurring run", "run every day/hour/Monday", "automate this service on a timer", "preview a cron", "pause/resume/disable a schedule", or "run it now". It builds the schedule against a published service (identity + endpoint + payload + serving revision), uses scope-owner NyxID auth (which requires the owner's NyxID broker binding), and covers preview, enable/disable, run-now, update, and delete. Publish the service first with the service-publisher skill.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-scheduler) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.3`
- Last synced: `2026-06-27T16:00:01.897Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-scheduler
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
