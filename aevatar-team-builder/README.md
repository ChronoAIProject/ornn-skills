# aevatar-team-builder

> Build an Aevatar agent team and its members over the REST API. Use when a user wants to "create a team", "add a member", "make a workflow member / script member / gagent member", "set the team's entry point", or "assemble agents into a team". It creates the team, creates members whose implementation is a workflow (most common), a script, or a hosted gagent, binds each member's concrete implementation (the workflow YAML is attached here), waits for the async binding to succeed, and sets the team entry member. Author the workflow YAML first with the workflow-authoring skill; publish the result as a service with the service-publisher skill.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-team-builder) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.3`
- Last synced: `2026-06-30T10:26:38.678Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-team-builder
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
