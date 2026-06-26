---
name: lark-calendar-ops
version: "1.0"
description: Calendar assistant over Lark calendar APIs — check free/busy across people, find a common slot, create or update an event with attendees, and answer "我今天/这周有什么安排". Doubles as the calendar-scope probe — if the bot tenant lacks calendar scopes it reports the exact missing permission instead of failing.
metadata:
  category: plain
  tag:
    - aevatar
    - s-capability
    - lark
    - calendar
    - scheduling
    - meetings
---

# Lark Calendar Ops

Use this for scheduling asks in chat: "明天下午约个会 / 看看我和某某周四有没有空 / 我今天有什么安排 /
把周五的评审改到 4 点".

**You (the agent) run the flow yourself** via NyxID-brokered access `nyxid_proxy`
`{slug:"api-lark-bot", path:"/open-apis/calendar/v4/...", method:...}`. ⚠ Calendar scopes are NOT
yet field-proven for this bot tenant — so this skill is also the probe: run the cheapest read
first, and if it 403s, report the exact scope error verbatim plus what to grant, then stop
gracefully. Never invent availability.

## How to run it

1. **Scope probe (always first, cheap read).**
   `GET /open-apis/calendar/v4/calendars` — lists calendars visible to the bot identity.
   On 403/scope error: report verbatim, state that the tenant app needs calendar scopes
   (e.g. `calendar:calendar`, `calendar:calendar.event:read/write`, freebusy read), and stop.

2. **Resolve people and time.** Map names to open_ids via prior chat context or
   `POST /open-apis/contact/v3/users/batch_get_id?user_id_type=user_id` / chat member lookup; never
   guess ids. Convert "明天下午/周四" to concrete RFC3339 times in the user's timezone
   (default Asia/Shanghai unless the chat says otherwise) and SAY the concrete times back.

3. **Free/busy.** `POST /open-apis/calendar/v4/freebusy/list` with `time_min`/`time_max` and the
   user ids. To find a common slot: intersect the gaps, prefer working hours 10:00-18:00, offer the
   2-3 best candidates with duration.

4. **My agenda.** Read the primary calendar's events for the window
   (`GET /open-apis/calendar/v4/calendars/{calendar_id}/events` with time filters) and render:
   `[时间] 标题 (地点/链接, 参与人数)` in chronological order.

5. **Create / update (explicit confirmation required).** Echo the exact event first — title, start,
   end, timezone, attendees — and only on the user's confirm:
   `POST /open-apis/calendar/v4/calendars/{calendar_id}/events` body
   `{summary, start_time:{timestamp,timezone}, end_time:{...}}`, then add attendees via
   `POST .../events/{event_id}/attendees`. Update = `PATCH .../events/{event_id}`. Report the
   created event id and time back.

## Failure semantics

- Scope 403 anywhere → verbatim error + the missing-scope prescription from step 1; never retry.
- Attendee resolution failure → name the person you could not resolve and ask for their open_id or
  an @mention; never book with a guessed id.

## Guardrails

- Never create, modify, or delete events without an explicit user confirm of the echoed details in
  this conversation; deletion additionally requires the user to name the exact event.
- Treat other people's calendar details as sensitive: report free/busy as busy blocks, not event
  titles, unless the calendar is the requester's own.
- Only use real returned data; never ask the user for tokens — your NyxID-brokered tools handle
  all credentials.
