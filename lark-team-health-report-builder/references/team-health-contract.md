# Team health contract

This contract defines deterministic behavior for `lark-team-health-report-builder`.

## Original n8n flow

The original workflow:

1. Receives a Lark webhook event at `lark-team-health`.
2. Immediately responds to Lark challenge requests.
3. Parses `/team-health` commands.
4. Sends a progress text message to the source chat.
5. Collects GitHub activity and asks an LLM for analysis.
6. Sends a final text report to the source chat.

This skill implements steps 2, 3, 4, and 6 payload construction only.

## Command parsing

Read the event body from `input.body` when present; otherwise use root input.

If `body.challenge` exists, return:

```json
{ "skip": true, "is_challenge": true, "challenge": "<challenge>" }
```

Message event is valid when `body.header.event_type` or `body.event.type` contains `message`.

Extract text from `body.event.message.content`. If it is JSON, parse it and use `content.text`; otherwise use the raw string.

Only `/team-health` commands are handled. Other messages return:

```json
{ "skip": true, "reason": "not a team-health command" }
```

Command form:

```text
/team-health [targetUser]
```

Alias map:

```json
{ "shining": "chronoai-shining" }
```

## Parsed command output

Return:

```json
{
  "skip": false,
  "chat_id": "<message.chat_id>",
  "user_id": "<sender user_id>",
  "target_user": "<resolved target or null>",
  "display_user": "<raw target or null>",
  "is_single": true
}
```

## Progress message

Build connector-ready Lark body for:

```text
POST /open-apis/im/v1/messages?receive_id_type=chat_id
```

Body:

```json
{
  "receive_id": "<chat_id>",
  "msg_type": "text",
  "content": "{\"text\":\"⏳ 正在分析 <display_user> 的状态，约30秒...\"}"
}
```

For full-team analysis, text is:

```text
⏳ 正在分析全团队状态，约2分钟...
```

## Final report message

Given `report` and `chat_id`, build:

```json
{
  "receive_id": "<chat_id>",
  "msg_type": "text",
  "content": "{\"text\":\"<report>\"}"
}
```

## Missing information

If a handled command lacks `chat_id`, return:

```json
{ "needs_more_information": true, "missing": ["chat_id"] }
```
