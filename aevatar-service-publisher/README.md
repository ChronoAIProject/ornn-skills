# aevatar-service-publisher

> Publish an Aevatar member, team, or workflow as an invocable service and (host permitting) register it with NyxID, then verify and invoke it — all over the REST API. Use when a user wants to "publish/bind a service", "expose my workflow/team as a service", "register it with NyxID", "make it callable", "get the service slug/URL", "invoke my service", or "version/deploy/roll out a service". It covers the simple scope binding, reading back a member's published service, the full account-level service lifecycle (revision → publish → deploy → rollout), how to confirm the NyxID registration (slug + status), and how to invoke an endpoint. Build the team/member first with the team-builder skill.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-service-publisher) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.2`
- Last synced: `2026-06-29T20:00:01.904Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-service-publisher
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
