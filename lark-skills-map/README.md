# lark-skills-map

> Index, router, and dependency map for the aevatar Lark/Feishu skill family on ornn — load this FIRST when someone wants the bot to do anything in Lark (send a message, recall a chat, write a doc / sheet / Base record, manage a calendar event, run an approval). It names the six core operation primitives (im / docx / sheets / bitable / calendar / approval), states the one shared premise (every call goes through nyxid_proxy slug api-lark-bot, scope-probe-first), routes intent to exactly one primitive, lists which business workflows consume them, and flags the current cleanup items. It does not call Lark itself — it routes to the right ops skill.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/lark-skills-map) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.0`
- Last synced: `2026-07-02T10:00:02.467Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/lark-skills-map
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
