# aevatar Lark/Feishu bot — NyxID-direct registration contract

Companion to `SKILL.md`. Authoritative source is the code; if a live API disagrees, the API is right. Citations are `file:line` in the NyxID backend/CLI (`~/Code/NyxID/backend/src`, `~/Code/NyxID/cli/src`) and aevatar (`~/Code/aevatar`), as of 2026-06.

> **Architecture note.** aevatar does **not** register channel bots and keeps **no** local registration mirror. A previous `POST /api/channels/registrations` provisioning facade (and a `ChannelBotRegistration` actor/readmodel) was deleted as redundant. Registration is a pure NyxID operation; aevatar only receives the relay callback and trusts the NyxID-issued token for the tenant scope.

---

## 1. Conventions

| Surface | Base URL | Auth |
|---|---|---|
| NyxID API | `https://nyx-api.chrono-ai.fun` | `nyxid login` bearer (or `NYXID_API_KEY`). The token's user is the **bot owner**. |
| aevatar relay callback | `https://aevatar-console-backend-api.aevatar.ai/api/webhooks/nyxid-relay` | the relay callback token NyxID mints from the relay api-key (validated by aevatar). |

**Inbound scope (the key fact).** When NyxID relays an inbound message to aevatar, aevatar resolves the tenant scope from the **validated callback JWT**: `scope_id ?? sub ?? NameIdentifier` (`aevatar: NyxIdRelayAuthValidator.cs:150-152` → `NyxIdChatEndpoints.Relay.cs:70`). There is no api-key→scope mirror lookup. The relay api-key (step 2) is what carries the bot-owner identity into that token.

**Outbound reply (the other key fact).** The basic text reply is sent by **NyxID's own platform adapter** (`adapter.send_reply`) when aevatar POSTs to `/api/v1/channel-relay/reply`. The `api-lark-bot` proxy (step 4) is required only for the agent's **proactive** Lark API calls (send/edit/react/CardKit), not for the relay reply.

---

## 2. Step 1 — `nyxid channel-bot register`

CLI (`~/Code/NyxID/cli/src/commands/channel_bot.rs:14-107`, flags `cli.rs:3586-3700`): `--platform lark|feishu`, `--label`, `--app-id`, `--app-secret-env` (hidden `--app-secret`), **`--token-env` (mandatory even for Lark — the backend requires a non-empty `bot_token`, so pass a placeholder like `__unused_for_lark__`; omitting it errors `bot token is required` and blocks on an interactive prompt)**, `--verification-token` (required for lark/feishu; env fallback `NYXID_LARK_VERIFICATION_TOKEN`), optional `--encrypt-key`. REST: `POST /api/v1/channel-bots` `{platform, bot_token, label, app_id, app_secret, verification_token, encrypt_key?}`.

- **Credential validation at create:** `create_bot` calls `verify_bot_token("app_id:app_secret")` → Lark `tenant_access_token` (`backend: channel_bot_service.rs:141-154`, `lark.rs` verify). Wrong secret → `ChannelPlatformError`.
- **Global active-uniqueness:** `find_one({platform, platform_bot_id=<app_id>, is_active:true})` with no owner filter (`channel_bot_service.rs:156-172`) → `409 Conflict` if any active bot for this `app_id` exists anywhere. `platform_bot_id` IS the `app_id`.
- **Lifecycle:** Lark `register_webhook` is a no-op (`lark.rs`); the bot is `pending_webhook` and promotes to `active` on the first verified inbound event.
- Response carries the bot `id`, `permission_setup_url`, and `permission_setup_scopes` (`im:message`, `im:message:send_as_bot`).

---

## 3. Step 2 — relay api-key

CLI: `nyxid api-key create --name --scopes "read write" --callback-url <aevatar relay> [--allow-all-services | --allowed-services …] --output json`. REST: `POST /api/v1/api-keys` `{name, scopes, callback_url, allow_all_services|allowed_service_ids}` (`backend: api_keys.rs:1122-1189`; requires write scope). The create response **omits `callback_url`** — confirm it stuck with `nyxid api-key show <id> --output json`.

- The `callback_url` is where NyxID's relay forwards inbound events. Set it to aevatar's `/api/webhooks/nyxid-relay`.
- The api-key's minted relay callback token carries the bot-owner scope aevatar reads (see §1). Save the api-key **`id`** for step 3.
- Include the proxy + LLM services the relayed turn must reach (`--allow-all-services` is simplest).

---

## 4. Step 3 — conversation route

CLI: `nyxid channel-bot route create --bot-id <BOT_ID> --agent-key-id <RELAY_API_KEY_ID> --default-agent` (omit `--conversation-id` for a catch-all). REST: `POST /api/v1/channel-conversations` `{channel_bot_id, agent_api_key_id, default_agent:true, platform_conversation_id?, platform_conversation_type?, platform_sender_id?}` (`backend: channel_conversations.rs:302-377`). NyxID's `channel_relay_service` (`forward_to_agent` → `callback_url`) uses the route to pick which api-key/callback handles each inbound event.

---

## 5. Step 4 — `api-lark-bot` proxy (proactive tools only)

Connect on the **bot-owner** account. aevatar issues proactive Lark calls via `nyxClient.ProxyRequestAsync(token, "api-lark-bot", "open-apis/im/v1/messages…")` → NyxID `/api/v1/proxy/s/api-lark-bot/{path}`. The default slug `api-lark-bot` is configurable via `Aevatar:Lark:NyxProviderSlug` (`aevatar: LarkToolOptions.cs`, `MainnetHostBuilderExtensions.cs`). The proxy endpoint base must match the region: lark → `https://open.larksuite.com`, feishu → `https://open.feishu.cn`. NOT needed for the plain relay reply.

Connect: `nyxid service add api-lark-bot --credential-env LARK_APP_CREDS --label "Lark App <app_id>"` where `LARK_APP_CREDS` is a **JSON object** `{"app_id":"…","app_secret":"…"}` — `api-lark-bot` is a `token_exchange` catalog service, so a bare string / `app_id:app_secret` is rejected (`'api-lark-bot' requires the credential to be a JSON object with fields [app_id, app_secret]`). **Slug-collision caveat:** the proxy is resolved by the bare slug with no per-bot disambiguation, so two *personal* `api-lark-bot` services (two Lark apps under one owner) make proactive calls ambiguous; keep one personal `api-lark-bot` per owner (`nyxid service delete <id>` retired ones). Org-shared `api-lark-bot` services don't collide with the personal one.

---

## 6. Step 5 — manual console activation

- Event Subscription Request URL = `{nyx_base}/api/v1/webhooks/channel/{lark|feishu}/{bot_id}` (built `backend: channel_bots.rs:490-493`; routes `routes.rs:1082 lark / :1086 feishu`, `channel_webhooks.rs:144 lark / :170 feishu`). The platform segment must match the registered platform.
- **One URL for events + card actions.** `card.action.trigger` (interactive buttons) rides on the SAME event-subscription URL — `parse_inbound` dispatches both `im.message.receive_v1` and `card.action.trigger` (`lark.rs:52,618-644`). If the console has a separate "card callback / 卡片请求网址" field, use the same URL.
- **Two distinct callbacks — do not confuse:** the Lark-console URL above is Lark→NyxID; the relay api-key's `callback_url` (`…/api/webhooks/nyxid-relay`, step 2) is NyxID→aevatar and is never entered in the Lark console.
- Verification Token must equal step 1's `--verification-token` (constant-time checked per event). Optional Encrypt Key must equal `--encrypt-key`.
- Scopes `im:message` + `im:message:send_as_bot` via `permission_setup_url` (`backend: channel_bots.rs:973-974`, `lark_permission.rs`).
- `nyxid channel-bot verify <BOT_ID>` → `POST /api/v1/channel-bots/{id}/verify` (requires the verification token present — `channel_bots.rs:149-152`).

---

## 7. Step 6 — owner LLM service

The relay turn resolves all creds/LLM as the **bot owner** (not the chat sender). The owner must have a chat-completions-capable NyxID service. `nyxid service add llm-openai|llm-anthropic|llm-deepseek …` — NyxID treats `llm-`-prefixed slugs as LLM-capable (`backend: proxy.rs:2266`, `llm_gateway.rs:120`). Without it, synthesis yields the empty-response fallback. aevatar checks the owner's LLM availability via the `nyxid_llm_status` tool (`aevatar: NyxIdApiClient.cs:116`).

---

## 8. lark vs feishu — the only platform-conditional values

| | lark | feishu |
|---|---|---|
| `--platform` | `lark` | `feishu` |
| outbound API base | `https://open.larksuite.com` | `https://open.feishu.cn` |
| console host | open.larksuite.com | open.feishu.cn |
| webhook path segment | `…/channel/lark/<id>` | `…/channel/feishu/<id>` |

(`backend: lark.rs:103/112`, `channel_webhooks.rs:144/170`, `routes.rs:1082/1086`.) Verification token, app_id/app_secret, `im:message` scopes, route, api-key, and LLM setup are identical.

---

## 9. Failure decode

| Symptom | Cause |
|---|---|
| `409 … already registered on lark` | active bot for this `app_id` exists globally (§2 uniqueness) — delete/reuse |
| credential / `tenant_access_token` error at register | wrong `app_secret` or wrong region |
| stuck `pending_webhook` | console URL/token mismatch, app unpublished, or wrong `/lark/` vs `/feishu/` segment |
| empty "Sorry…" reply | no owner LLM service (§7) or api-key allow-list excludes it |
| proactive send/CardKit fails, plain reply works | `api-lark-bot` proxy not connected (§5) |
