# aevatar-lark-bot-registration

> Register (bind) a Lark or Feishu bot so its messages are handled by an aevatar agent and replies are sent back, via the NyxID relay. The bot is registered DIRECTLY on NyxID (nyxid channel-bot register, then a relay api-key whose callback_url is aevatar's /api/webhooks/nyxid-relay, then a default conversation route), activated manually in the Lark/Feishu developer console (event subscription URL, matching verification token, im:message scopes), with an LLM service connected on the bot-owner account so replies are non-empty. aevatar no longer exposes its own /api/channels/registrations endpoint — inbound scope is derived from the NyxID relay callback token. Covers the exact nyxid CLI and NyxID REST calls, the lark vs feishu region differences, the api-lark-bot proxy (needed only for proactive Lark tool calls), and the common failure modes. Use when asked to bind, register, connect, or onboard a Lark or Feishu bot to aevatar, or to debug a bot that is not replying.

---

**Mirrored from [Ornn](https://ornn.chrono-ai.fun/skills/aevatar-lark-bot-registration) — read-only.**

Edits here are NOT propagated back. Submit changes on Ornn.

- Latest version: `2.1`
- Last synced: `2026-06-24T03:53:52.736Z`

## Install

```bash
npx skills add ChronoAIProject/ornn-skills/aevatar-lark-bot-registration
```

## Use

See `SKILL.md` in this folder for the full instructions an AI agent
follows when this skill is loaded.
