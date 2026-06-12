# IM — Messages & Chats

## Concepts

- **Message** (`om_xxx`): A single message in a chat. Supports types: `text`, `post`, `image`, `file`, `audio`, `media` (video), `sticker`, `interactive` (card), `share_chat`, `share_user`, `merge_forward`, etc.
- **Chat** (`oc_xxx`): A group chat or P2P (direct message) conversation.
- **Thread** (`omt_xxx` or `om_xxx`): A reply thread under a message. Threads appear when a message has been replied to using the thread feature.
- **Reaction**: An emoji reaction on a message, identified by `reaction_id`.

```
Chat (oc_xxx)
├── Message (om_xxx)
│   ├── Thread (omt_xxx — reply thread)
│   ├── Reaction (emoji)
│   └── Resource (image_key / file_key)
└── Member (user ou_xxx / bot cli_xxx)
```

---

## API Reference

### Send a message

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages?receive_id_type=chat_id" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/messages?receive_id_type=chat_id" -m POST -d '...'`
- **Scopes:** Bot `im:message` | User `im:message.send_as_user` + `im:message`

**Query param `receive_id_type`** must match the ID you pass in `receive_id`:

| `receive_id_type` | `receive_id` value |
|-------------------|--------------------|
| `chat_id` | `oc_xxx` — group chat |
| `open_id` | `ou_xxx` — send as DM |
| `user_id` | user's user_id field |
| `email` | user's email address |
| `union_id` | user's union_id field |

**Body template:**

```json
{
  "receive_id": "oc_xxx",
  "msg_type": "text",
  "content": "{\"text\":\"hello\"}",
  "uuid": "optional-idempotency-key"
}
```

The `content` field is **a JSON string** (double-encoded). The inner JSON structure depends on `msg_type`:

| `msg_type` | Inner `content` JSON |
|------------|---------------------|
| `text` | `{"text":"Hello <at user_id=\"ou_xxx\">name</at>"}` |
| `post` | `{"zh_cn":{"title":"Title","content":[[{"tag":"text","text":"Body"}]]}}` |
| `image` | `{"image_key":"img_xxx"}` |
| `file` | `{"file_key":"file_xxx"}` |
| `audio` | `{"file_key":"file_xxx"}` |
| `media` (video) | `{"file_key":"file_xxx","image_key":"img_xxx"}` (image_key = cover, required) |
| `share_chat` | `{"chat_id":"oc_xxx"}` |
| `share_user` | `{"user_id":"ou_xxx"}` |
| `interactive` | Card JSON object (Feishu interactive card format) |

**@mention format:** `<at user_id="ou_xxx">display name</at>` | @all: `<at user_id="all"></at>`

**Reply to a specific message** (thread reply): add `reply_in_thread=true` to body. Use the `/messages/:message_id/reply` endpoint instead — see "Reply to a message" below.

**Response:**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "message_id": "om_xxx",
    "chat_id": "oc_xxx",
    "create_time": "1234567890"
  }
}
```

---

### Reply to a message

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages/om_xxx/reply" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/messages/om_xxx/reply" -m POST -d '...'`
- **Scopes:** Bot `im:message` | User `im:message.send_as_user` + `im:message`

**Body template:**

```json
{
  "msg_type": "text",
  "content": "{\"text\":\"OK, I will handle it\"}",
  "reply_in_thread": false,
  "uuid": "optional-idempotency-key"
}
```

Set `reply_in_thread: true` to send the reply inside the thread (does not appear in the main chat stream).

**Response:** same shape as Send a message.

---

### List chats (bot or user visible chats)

Returns chats the bot or user is a member of.

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot /open-apis/im/v1/chats`
- **User:** `nyxid proxy request api-lark /im/v1/chats`
- **Scopes:** Bot `im:chat:read` | User `im:chat:read`

**Query params (append to path):**

| Param | Description |
|-------|-------------|
| `page_size` | Number of results (max 100, default 20) |
| `page_token` | Pagination token from previous response |
| `sort_type` | `ByCreateTimeAsc` / `ByCreateTimeDesc` (default) |

```bash
# Bot: list all chats with page size
nyxid proxy request api-lark-bot "/open-apis/im/v1/chats?page_size=50"

# User: list chats
nyxid proxy request api-lark "/im/v1/chats?page_size=50"
```

**Response:**

```json
{
  "data": {
    "items": [
      {
        "chat_id": "oc_xxx",
        "name": "Chat name",
        "description": "...",
        "owner_id": "ou_xxx",
        "chat_status": "normal",
        "external": false
      }
    ],
    "page_token": "xxx",
    "has_more": true
  }
}
```

---

### Search chats

Search visible group chats by keyword and/or member IDs. Requires at least one of `query` or `member_ids`.

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v2/chats/search" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v2/chats/search" -m POST -d '...'`
- **Scopes:** Bot `im:chat:read` | User `im:chat:read`

**Body template:**

```json
{
  "query": "project",
  "search_type": ["private", "public_joined"],
  "member_ids": ["ou_xxx", "ou_yyy"],
  "page_size": 20,
  "page_token": ""
}
```

All fields are optional — but at least one of `query` or `member_ids` must be non-empty.

**`search_type` values:** `private`, `external`, `public_joined`, `public_not_joined`

**Response:**

```json
{
  "data": {
    "chats": [
      {
        "chat_id": "oc_xxx",
        "name": "Project Group",
        "description": "...",
        "owner_id": "ou_xxx",
        "external": false,
        "chat_status": "normal"
      }
    ],
    "page_token": "xxx",
    "has_more": false
  }
}
```

---

### List messages in a chat

Fetch message history for a group chat or DM.

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages?container_id_type=chat&container_id=oc_xxx"`
- **User:** `nyxid proxy request api-lark "/im/v1/messages?container_id_type=chat&container_id=oc_xxx"`
- **Scopes:** Bot `im:message:readonly` + `im:chat:read` | User `im:message:readonly` + `im:chat:read`

**Query params:**

| Param | Description |
|-------|-------------|
| `container_id_type` | Always `chat` for chat messages; use `thread` for thread messages |
| `container_id` | The `oc_xxx` chat ID (or `omt_xxx` / `om_xxx` for thread) |
| `start_time` | Unix timestamp (seconds), inclusive lower bound |
| `end_time` | Unix timestamp (seconds), inclusive upper bound |
| `sort_type` | `ByCreateTimeAsc` / `ByCreateTimeDesc` (default) |
| `page_size` | Max 50, default 50 |
| `page_token` | Pagination token |

```bash
# List recent messages in a group chat (default sort: newest first)
nyxid proxy request api-lark-bot "/open-apis/im/v1/messages?container_id_type=chat&container_id=oc_xxx&page_size=50"

# With time range (Unix seconds)
nyxid proxy request api-lark-bot "/open-apis/im/v1/messages?container_id_type=chat&container_id=oc_xxx&start_time=1710000000&end_time=1710086400"

# Thread messages
nyxid proxy request api-lark-bot "/open-apis/im/v1/messages?container_id_type=thread&container_id=omt_xxx"
```

**Response:**

```json
{
  "data": {
    "items": [
      {
        "message_id": "om_xxx",
        "msg_type": "text",
        "create_time": "1234567890",
        "sender": { "id": "ou_xxx", "sender_type": "user" },
        "body": { "content": "{\"text\":\"hello\"}" },
        "deleted": false,
        "updated": false,
        "thread_id": "omt_xxx",
        "mentions": [{ "id_type": "open_id", "id": "ou_xxx", "name": "Alice", "key": "@_user_1" }]
      }
    ],
    "has_more": true,
    "page_token": "xxx"
  }
}
```

`thread_id` is present only when the message has thread replies. `mentions` is present only when the message contains @mentions.

---

### Batch get messages (mget)

Fetch up to 50 messages by ID in a single call.

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages/mget?message_ids[]=om_aaa&message_ids[]=om_bbb"`
- **User:** `nyxid proxy request api-lark "/im/v1/messages/mget?message_ids[]=om_aaa&message_ids[]=om_bbb"`
- **Scopes:** Bot `im:message:readonly` | User `im:message:readonly`

Alternatively pass `message_ids` as comma-separated in a POST body — check the Feishu API docs for the exact format accepted. The GET form with repeated params is the most direct mapping.

**Response:** same shape as list messages (`items` array), limited to the requested IDs.

---

### Search messages

Full-text search across messages visible to the user. **User identity only.**

- **Method:** POST
- **User only:** `nyxid proxy request api-lark "/im/v1/messages/search" -m POST -d '...'`
- **Scopes:** User `search:message` (note: different domain from im scopes)

**Body template:**

```json
{
  "query": "project progress",
  "from_ids": ["ou_xxx"],
  "chat_ids": ["oc_xxx"],
  "message_type": "text",
  "at_chatter_filter_operator_type": "and",
  "at_chatter_ids": [],
  "with_application_bot": false,
  "page_size": 20,
  "page_token": ""
}
```

All fields except `query` are optional. Use `from_ids` to filter by sender, `chat_ids` to restrict to a specific chat.

**Response:**

```json
{
  "data": {
    "items": [
      {
        "message_id": "om_xxx",
        "chat_id": "oc_xxx"
      }
    ],
    "has_more": true,
    "page_token": "xxx"
  }
}
```

The search response returns only `message_id` and `chat_id`. Use batch mget to fetch full message content for each result.

---

### Download message resource (image/file)

Download the binary resource attached to a message (image, file, audio, video).

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages/om_xxx/resources/file_key?type=image"`
- **User:** `nyxid proxy request api-lark "/im/v1/messages/om_xxx/resources/file_key?type=image"`
- **Scopes:** Bot `im:message:readonly` | User `im:message:readonly`

**Query param `type`:** `image` or `file`

**Finding `file_key`:** parse the `body.content` JSON of the message:

| Message type in response | `body.content` key | `type` param |
|--------------------------|-------------------|--------------|
| `image` | `image_key` → `img_xxx` | `image` |
| `file` | `file_key` → `file_xxx` | `file` |
| `audio` | `file_key` → `file_xxx` | `file` |
| `media` (video) | `file_key` → `file_xxx` | `file` |

**Response:** binary stream (the file bytes). Save to disk via redirection or nyxid's `--output` option if available.

**Error 234002 / 14005:** no access to the resource or file deleted. Do not retry — return the error to the user.

---

### Create a group chat

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/chats" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/chats" -m POST -d '...'`
- **Scopes:** Bot `im:chat:create` | User `im:chat:create_by_user`

**Body template:**

```json
{
  "name": "Project Group",
  "description": "Owns Q2 goal tracking",
  "owner_id": "ou_xxx",
  "user_id_list": ["ou_aaa", "ou_bbb"],
  "bot_id_list": ["cli_aaa"],
  "chat_type": "private"
}
```

| Field | Notes |
|-------|-------|
| `name` | Required for `public` chat (min 2 chars, max 60 chars) |
| `description` | Max 100 chars |
| `owner_id` | Defaults to calling identity |
| `user_id_list` | Up to 50 open_ids |
| `bot_id_list` | Up to 5 app IDs (`cli_xxx`) |
| `chat_type` | `private` (default) or `public` |

**Bot visibility issue:** when using bot identity, adding users who are outside the app's visibility range returns error 232043. Workaround: create the group with only the current user, then add others via user identity (see Manage chat members below).

**Response:**

```json
{
  "data": {
    "chat_id": "oc_xxx",
    "name": "Project Group",
    "owner_id": "ou_xxx",
    "external": false
  }
}
```

---

### Update chat info

- **Method:** PUT
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/chats/oc_xxx" -m PUT -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/chats/oc_xxx" -m PUT -d '...'`
- **Scopes:** Bot `im:chat:update` | User `im:chat:update`

**Body template (include only fields to update):**

```json
{
  "name": "New Group Name",
  "description": "Updated description"
}
```

Caller must be the group owner or admin. Error 232016/232002/232017 means insufficient permissions. Error 232011 means the caller is not a member.

**Response:** `{ "code": 0, "msg": "success" }`

---

### Manage chat members

#### Add members

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/chats/oc_xxx/members" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/chats/oc_xxx/members" -m POST -d '...'`
- **Scopes:** Bot `im:chat.members:write_only` | User `im:chat.members:write_only`

**Query param `member_id_type`:** `open_id` (default) | `union_id` | `user_id`

**Body template:**

```json
{
  "id_list": ["ou_aaa", "ou_bbb"],
  "succeed_type": 1
}
```

`succeed_type=1`: add reachable users, return unreachable ones in `invalid_id_list` (instead of failing the whole request). Recommended when adding multiple users.

**Response:**

```json
{
  "data": {
    "invalid_id_list": ["ou_zzz"]
  }
}
```

#### Remove members

- **Method:** DELETE
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/chats/oc_xxx/members" -m DELETE -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/chats/oc_xxx/members" -m DELETE -d '...'`
- **Scopes:** Bot `im:chat.members:write_only` | User `im:chat.members:write_only`

**Body template:**

```json
{
  "id_list": ["ou_aaa"]
}
```

Max 50 users or 5 bots per request. Only owner, admin, or creator can remove others.

#### Get member list

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/chats/oc_xxx/members"`
- **User:** `nyxid proxy request api-lark "/im/v1/chats/oc_xxx/members"`
- **Scopes:** Bot `im:chat.members:read` | User `im:chat.members:read`

**Query params:** `member_id_type=open_id`, `page_size`, `page_token`

**Response:**

```json
{
  "data": {
    "items": [
      { "member_id_type": "open_id", "member_id": "ou_xxx", "name": "Alice", "tenant_key": "..." }
    ],
    "page_token": "xxx",
    "has_more": false
  }
}
```

---

### Add reaction

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages/om_xxx/reactions" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/messages/om_xxx/reactions" -m POST -d '...'`
- **Scopes:** Bot `im:message.reactions:write_only` | User `im:message.reactions:write_only`

**Body template:**

```json
{
  "reaction_type": {
    "emoji_type": "THUMBSUP"
  }
}
```

**Response:**

```json
{
  "data": {
    "reaction_id": "ZCaCIjUBVVWSrm5L-3ZTw_xxx",
    "operator": { "operator_id": "ou_xxx", "operator_type": "user" },
    "action_time": "1663054162546",
    "reaction_type": { "emoji_type": "THUMBSUP" }
  }
}
```

#### List reactions on a message

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages/om_xxx/reactions"`
- **User:** `nyxid proxy request api-lark "/im/v1/messages/om_xxx/reactions"`
- **Scopes:** Bot `im:message.reactions:read` | User `im:message.reactions:read`

**Query params:** `reaction_type` (filter by emoji, e.g., `SMILE`), `page_size`, `page_token`, `user_id_type`

#### Delete a reaction

- **Method:** DELETE
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages/om_xxx/reactions/reaction_id" -m DELETE`
- **User:** `nyxid proxy request api-lark "/im/v1/messages/om_xxx/reactions/reaction_id" -m DELETE`
- **Scopes:** Bot `im:message.reactions:write_only` | User `im:message.reactions:write_only`

Can only delete reactions added by the calling identity.

#### Batch query reactions

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/messages/reactions/batch_query" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/messages/reactions/batch_query" -m POST -d '...'`
- **Scopes:** Bot `im:message.reactions:read` | User `im:message.reactions:read`

**Body template:**

```json
{
  "queries": [
    { "message_id": "om_xxx" },
    { "message_id": "om_yyy", "page_token": "..." }
  ],
  "page_size_per_message": 10,
  "reaction_type": "LAUGH"
}
```

**Response fields:**
- `success_msg_reaction_details` — per-message reaction records
- `success_msg_reaction_counts` — per-message aggregated counts (`reaction_count[].reaction_type`, `reaction_count[].count`)
- `fail_msg_reaction_details` — failed queries with `fail_reason` (`invalid`, `invalid_page_token`, `no_permission`)

**Common `emoji_type` values:** `THUMBSUP`, `OK`, `SMILE`, `LAUGH`, `LOL`, `HEART`, `FIRE`, `CLAP`, `THINKING`, `SOB`, `DONE`, `LGTM`, `CheckMark`, `CrossMark`, `Hundred`

Full list (185 types): `https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message-reaction/emojis-introduce`

---

### Pin message

#### Pin a message

- **Method:** POST
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/pins" -m POST -d '...'`
- **User:** `nyxid proxy request api-lark "/im/v1/pins" -m POST -d '...'`
- **Scopes:** Bot `im:message.pins:write_only` | User `im:message.pins:write_only`

**Body template:**

```json
{
  "message_id": "om_xxx"
}
```

#### Unpin a message

- **Method:** DELETE
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/pins/om_xxx" -m DELETE`
- **User:** `nyxid proxy request api-lark "/im/v1/pins/om_xxx" -m DELETE`
- **Scopes:** Bot `im:message.pins:write_only` | User `im:message.pins:write_only`

#### List pinned messages in a chat

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/pins?chat_id=oc_xxx"`
- **User:** `nyxid proxy request api-lark "/im/v1/pins?chat_id=oc_xxx"`
- **Scopes:** Bot `im:message.pins:read` | User `im:message.pins:read`

**Query params:** `chat_id` (required), `start_time`, `end_time`, `page_size`, `page_token`

---

### Get chat info

- **Method:** GET
- **Bot:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/chats/oc_xxx"`
- **User:** `nyxid proxy request api-lark "/im/v1/chats/oc_xxx"`
- **Scopes:** Bot `im:chat:read` | User `im:chat:read`

Caller must be in the chat (or same tenant for internal chats) to get full details.

---

### Upload image (bot only)

Required before sending an image message — get an `image_key` first.

- **Method:** POST
- **Bot only:** `nyxid proxy request api-lark-bot "/open-apis/im/v1/images" -m POST -d '...'`
- **Scopes:** Bot `im:resource`

This endpoint uses `multipart/form-data`. The `nyxid proxy request` command may require a `--file` or form-data flag depending on nyxid version. Check `nyxid proxy request --help` for multipart support.

**Response:** `{ "data": { "image_key": "img_xxx" } }`

---

## Scope Reference

| Operation | Bot Scope | User Scope |
|-----------|-----------|------------|
| Send / reply messages | `im:message` | `im:message` + `im:message.send_as_user` |
| Read messages | `im:message:readonly` | `im:message:readonly` |
| List / search chats | `im:chat:read` | `im:chat:read` |
| Create chat | `im:chat:create` | `im:chat:create_by_user` |
| Update chat | `im:chat:update` | `im:chat:update` |
| Add / remove members | `im:chat.members:write_only` | `im:chat.members:write_only` |
| Read members | `im:chat.members:read` | `im:chat.members:read` |
| Reactions read | `im:message.reactions:read` | `im:message.reactions:read` |
| Reactions write | `im:message.reactions:write_only` | `im:message.reactions:write_only` |
| Pin read | `im:message.pins:read` | `im:message.pins:read` |
| Pin write | `im:message.pins:write_only` | `im:message.pins:write_only` |
| Image upload | `im:resource` | — (bot only) |
| Search messages | — | `search:message` |

---

## Pagination

All list endpoints follow the same pattern:

```bash
# First page
nyxid proxy request api-lark-bot "/open-apis/im/v1/messages?container_id_type=chat&container_id=oc_xxx"

# Response: "has_more": true, "page_token": "xxx"
# Next page — append both params
nyxid proxy request api-lark-bot "/open-apis/im/v1/messages?container_id_type=chat&container_id=oc_xxx&page_token=xxx&page_size=50"
```

Default page size is typically 20. Maximum is 50 for messages, 100 for chats. Keep paginating until `has_more: false`.

---

## Common Pitfalls

1. **Bot vs user identity affects which chats are visible.** A bot only sees chats it has been added to. User identity sees all chats the authorized user is in plus visible public chats.

2. **`receive_id_type` is required on send.** Missing this query param causes an immediate API error. Match the type to the ID format: `chat_id` for `oc_xxx`, `open_id` for `ou_xxx`.

3. **`content` is double-encoded JSON.** The `content` field in the request body is a JSON string, not a nested object. You must serialize the inner object to a string first: `"content": "{\"text\":\"hello\"}"`. Passing a raw object will fail.

4. **Card messages (`interactive`) are not suitable for downstream parsing.** When you receive an `interactive` message in an event, the raw card JSON is returned. There is no compact text representation.

5. **Bot sender name resolution may fail.** When fetching messages with bot identity, sender names may appear as `open_id` values instead of display names. This happens when the bot's app visibility does not cover the sender. Fix by expanding app visibility in the Lark developer console, or use user identity to fetch messages.

6. **Bot cannot add invisible users during group creation.** Error 232043. Use the two-step pattern: create the group (bot), then add members (user identity via members API with `succeed_type=1`).

7. **Image upload is bot-only.** The `im:resource` scope (for `/images`) is a bot-only scope. If you need to send an image as a user, upload via bot first to get `image_key`, then send the message as the user.

8. **Search messages (`/messages/search`) is user-only.** Bot identity is not supported. Requires `search:message` scope, which is distinct from `im:message` scopes.

9. **Thread ID sources.** Do not guess thread IDs. Fetch messages via list or mget and use the `thread_id` field when present. Thread messages use `container_id_type=thread` in the list endpoint.

10. **Path prefix mismatch causes 404.** `api-lark-bot` paths must start with `/open-apis/`. `api-lark` (user) paths must NOT include `/open-apis/` — the base URL already contains it. Double-prefixing produces `/open-apis/open-apis/...`.
