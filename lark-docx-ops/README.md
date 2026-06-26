# lark-docx-ops

> Create and edit Lark cloud documents (Docx) through the bot's NyxID-brokered docx/v1 + drive/v1 APIs — create a document and grant the requester access, append headings and text paragraphs, read a document's plain-text content, and share it with other people or make it tenant-readable. Handles the Docx block model (block_type + text_run elements) and the document-root block_id, grants the requester full_access on any doc it creates, and doubles as the docx-scope probe — on a scope 403 it reports the exact missing permission.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/lark-docx-ops) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `1.2`
- Last synced: `2026-06-26T08:00:02.953Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/lark-docx-ops
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
