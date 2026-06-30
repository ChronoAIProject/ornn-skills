# lark-bitable-ops

> Create and operate Lark Base (多维表格 / Bitable) tables through the bot's NyxID-brokered bitable/v1 + drive/v1 APIs — create a new Base and grant the requester access, list a Base's tables and a table's fields, read and filter records, create or update single rows, and batch-write many rows. Handles the app_token + table_id extraction from a Base share URL, writes by field NAME with the right typed value shapes (date = ms timestamp, person = open_id, single/multi-select = existing option names), grants the requester full_access on any Base it creates, and doubles as the bitable-scope probe — on a scope 403 it reports the exact missing permission. Lark Base here is the Bitable database product, distinct from Lark Sheets — use the Sheets skill for plain grid spreadsheets.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/lark-bitable-ops) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.3`
- Last synced: `2026-06-30T10:26:41.157Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/lark-bitable-ops
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
