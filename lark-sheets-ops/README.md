# lark-sheets-ops

> Read and write Lark Sheets (电子表格) through the bot's NyxID-brokered sheets APIs — find a spreadsheet and its sheet ids, read a cell range, append rows to the bottom, and overwrite a range. Handles the range format (sheetId!A1:D10) and the valueRange wrapper, extracts the spreadsheet_token from a share URL, and doubles as the sheets-scope probe — on a scope 403 it reports the exact missing permission. Lark Sheets here is the spreadsheet product, distinct from Lark Base / Bitable — use the Base skill for Bitable tables.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/lark-sheets-ops) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.0`
- Last synced: `2026-07-02T03:00:03.135Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/lark-sheets-ops
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
