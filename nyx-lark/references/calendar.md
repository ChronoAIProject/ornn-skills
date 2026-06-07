# Calendar — Events & Scheduling

All calendar APIs use **user identity**: `nyxid proxy request api-lark /calendar/v4/...`

## Concepts

- **Calendar** (`calendar_id`): container for events. Every user has a primary calendar (`primary`). Shared/subscribed calendars have explicit IDs.
- **Event** (`event_id`): a single occurrence with start/end time, summary, attendees, optional recurrence. Supports recurring events per RFC 5545.
- **Instance**: the concrete time slot of a recurring event. Querying by time range returns expanded instances.
- **All-day event**: date-only, no clock time. End date is **inclusive** — a one-day event has start == end date.
- **Recurrence** (`rrule`): RFC 5545 RRULE string, e.g. `FREQ=WEEKLY;BYDAY=MO;INTERVAL=1`. `COUNT` and `UNTIL` cannot appear together.
- **Attendee**: a participant — user (`ou_` prefix), group (`oc_`), meeting room (`omm_`), or external email.
- **RSVP**: attendee response status — `accept` / `decline` / `tentative` / `removed`.
- **FreeBusy**: busy time blocks for a user within a time range. Returns only time windows, no event titles (privacy).

## Required Scopes

| Operation | Scope |
|-----------|-------|
| Read calendars / events | `calendar:calendar:read`, `calendar:calendar.event:read` |
| Create events | `calendar:calendar.event:create` |
| Update events / attendees | `calendar:calendar.event:update` |
| Delete events | `calendar:calendar.event:delete` |
| Free/busy query | `calendar:calendar.free_busy:read` |

---

## API Reference

### Get primary calendar

Returns the user's primary calendar ID and metadata.

```bash
nyxid proxy request api-lark /calendar/v4/calendars/primary
```

- **Method:** GET
- **Path:** `/calendar/v4/calendars/primary`
- **Response:** `data.calendar` — `{ calendar_id, summary, type: "primary" }`

---

### List calendars

Returns all calendars the user owns or subscribes to.

```bash
nyxid proxy request api-lark /calendar/v4/calendars
```

- **Method:** GET
- **Path:** `/calendar/v4/calendars`
- **Response:** `data.calendar_list[]` — each item has `calendar_id`, `summary`, `type` (`primary` / `shared` / `other`)

---

### List events (agenda)

Fetches events within a time window. Returns expanded instances for recurring events.

```bash
nyxid proxy request api-lark \
  "/calendar/v4/calendars/{calendar_id}/events?start_time=START_UNIX&end_time=END_UNIX"
```

- **Method:** GET
- **Path:** `/calendar/v4/calendars/{calendar_id}/events`
- **Query params:**
  - `start_time` — Unix timestamp string (seconds)
  - `end_time` — Unix timestamp string (seconds)
  - `page_size` — optional, default 20, max 50
  - `page_token` — for pagination
- **Response:** `data.items[]` — each has `event_id`, `summary`, `start_time.timestamp`, `end_time.timestamp`, `status`

To list today's events use the primary calendar:

```bash
nyxid proxy request api-lark \
  "/calendar/v4/calendars/primary/events?start_time=START_UNIX&end_time=END_UNIX"
```

---

### Get event

Fetch a single event by ID.

```bash
nyxid proxy request api-lark /calendar/v4/calendars/{calendar_id}/events/{event_id}
```

- **Method:** GET
- **Path:** `/calendar/v4/calendars/{calendar_id}/events/{event_id}`
- **Response:** `data.event` — full event object including `summary`, `description`, `start_time`, `end_time`, `attendees`, `recurrence`, `location`

---

### Create event

Creates a new event. `start_time` and `end_time` use Unix timestamp strings.

```bash
nyxid proxy request api-lark "/calendar/v4/calendars/{calendar_id}/events" \
  -m POST -d '{
    "summary": "Product Review",
    "description": "Weekly product sync",
    "start_time": { "timestamp": "1741586400" },
    "end_time":   { "timestamp": "1741590000" },
    "location":   { "name": "5F-Main Room" },
    "attendee_ability": "can_modify_event",
    "reminders": [{ "minutes": 5 }]
  }'
```

- **Method:** POST
- **Path:** `/calendar/v4/calendars/{calendar_id}/events`
- **Body fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `summary` | string | no | Event title |
| `description` | string | no | Agenda, notes, links |
| `start_time.timestamp` | string | yes* | Unix seconds as string |
| `end_time.timestamp` | string | yes* | Unix seconds as string |
| `start_time.date` | string | yes* | `YYYYMMDD` for all-day events |
| `end_time.date` | string | yes* | `YYYYMMDD` for all-day (inclusive) |
| `location.name` | string | no | Location description |
| `attendee_ability` | string | no | `can_modify_event` / `can_invite_others` / `can_see_others` / `none` |
| `free_busy_status` | string | no | `busy` (default) / `free` |
| `recurrence` | string[] | no | RFC 5545 RRULE strings |
| `reminders` | array | no | `[{ "minutes": 5 }]` |
| `visibility` | string | no | `default` / `public` / `private` |

*Use `timestamp` for timed events, `date` for all-day events.

- **Response:** `data.event` — created event object with `event_id`, `calendar_id`

After creating an event, add attendees separately using the attendees endpoint.

---

### Update event

Partial update — include only the fields to change.

```bash
nyxid proxy request api-lark "/calendar/v4/calendars/{calendar_id}/events/{event_id}" \
  -m PATCH -d '{
    "summary": "Updated Title",
    "end_time": { "timestamp": "1741593600" }
  }'
```

- **Method:** PATCH
- **Path:** `/calendar/v4/calendars/{calendar_id}/events/{event_id}`
- **Body:** same fields as create, only changed fields needed
- **Response:** `data.event` — updated event object

---

### Delete event

```bash
nyxid proxy request api-lark \
  "/calendar/v4/calendars/{calendar_id}/events/{event_id}?need_notification=false" \
  -m DELETE
```

- **Method:** DELETE
- **Path:** `/calendar/v4/calendars/{calendar_id}/events/{event_id}`
- **Query params:**
  - `need_notification` — `true` (default) to notify attendees, `false` to delete silently
- **Response:** empty `data` on success

---

### List attendees

```bash
nyxid proxy request api-lark \
  /calendar/v4/calendars/{calendar_id}/events/{event_id}/attendees
```

- **Method:** GET
- **Path:** `/calendar/v4/calendars/{calendar_id}/events/{event_id}/attendees`
- **Response:** `data.items[]` — each has `attendee_id`, `type`, `user_id`, `rsvp_status`, `display_name`

---

### Add attendees

Add participants after event creation (or to update the attendee list).

```bash
nyxid proxy request api-lark \
  "/calendar/v4/calendars/{calendar_id}/events/{event_id}/attendees" \
  -m POST -d '{
    "attendees": [
      { "type": "user", "user_id": "ou_xxx" },
      { "type": "group", "user_id": "oc_yyy" }
    ]
  }'
```

- **Method:** POST
- **Path:** `/calendar/v4/calendars/{calendar_id}/events/{event_id}/attendees`
- **Body:** `attendees[]` array

| `type` | `user_id` format | Notes |
|--------|-----------------|-------|
| `user` | `ou_xxx` | Lark user open_id |
| `group` | `oc_xxx` | Group chat ID |
| `resource` | `omm_xxx` | Meeting room resource |
| `third_party` | email address | External participant |

- **Response:** `data.attendees[]` — created attendee objects

---

### RSVP to event

Update the current user's RSVP status for an event they were invited to.

```bash
nyxid proxy request api-lark \
  "/calendar/v4/calendars/{calendar_id}/events/{event_id}/attendees/batch_rsvp" \
  -m POST -d '{
    "rsvp_status": "accept"
  }'
```

- **Method:** POST
- **Path:** `/calendar/v4/calendars/{calendar_id}/events/{event_id}/attendees/batch_rsvp`
- **Body:**
  - `rsvp_status`: `accept` / `decline` / `tentative`
- **Response:** `data` confirming updated status

---

### Query free/busy

Returns busy time blocks for one or more users within a time range. Does not reveal event titles — time windows only.

```bash
nyxid proxy request api-lark /calendar/v4/freebusy/list \
  -m POST -d '{
    "time_min": "1741564800",
    "time_max": "1741651200",
    "user_id": {
      "user_id": "ou_xxx",
      "id_type": "open_id"
    }
  }'
```

- **Method:** POST
- **Path:** `/calendar/v4/freebusy/list`
- **Body fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `time_min` | string | yes | Unix seconds (start of range) |
| `time_max` | string | yes | Unix seconds (end of range) |
| `user_id.user_id` | string | yes | `ou_xxx` open_id |
| `user_id.id_type` | string | yes | `open_id` |

- **Response:** `data.freebusy_list[]` — each entry has `start_time`, `end_time`, `rsvp_status`

To check multiple users, call this endpoint once per user and compare results.

---

## Key Patterns

### Time format

All timed events use **Unix timestamp strings** (seconds, not milliseconds):

```bash
# Convert ISO 8601 to Unix timestamp on macOS
date -j -f "%Y-%m-%dT%H:%M:%S" "2026-04-14T10:00:00" "+%s"

# Convert Unix timestamp back to human-readable
date -r 1744610400
```

Never do timestamp arithmetic mentally — always use system date commands.

### All-day events

Use `date` field (`YYYYMMDD`) instead of `timestamp`. End date is **inclusive**:

```json
{
  "start_time": { "date": "20260414" },
  "end_time":   { "date": "20260414" }
}
```

A two-day all-day event spanning Apr 14–15 would have `end_time.date = "20260415"`.

### Recurring events

Pass `recurrence` as an array of RFC 5545 RRULE strings:

```json
{ "recurrence": ["FREQ=WEEKLY;BYDAY=MO;INTERVAL=1"] }
```

`COUNT` and `UNTIL` cannot appear together in the same rule.

### Week definition

Monday is the first day of the week. Sunday is the last day. This matters when computing "next Monday" or "this week" — always derive from current date using system tools.

### Two-step decision for scheduling

- **Specific time known** (e.g., "tomorrow at 10am") → call free/busy to check conflicts, then create.
- **Vague range** (e.g., "sometime this week") → use the suggestion endpoint if available via lark-cli shortcut, or query free/busy across the range to find open slots.

---

## Common Pitfalls

- **Never do mental date math.** Use `date` shell commands for all timestamp conversions.
- **All-day end date is inclusive.** A one-day event has the same start and end date.
- **Cannot book meeting rooms without an existing room ID.** Room IDs use `omm_` prefix and must be obtained from the org's resource list — no lookup-by-name API.
- **`api-lark` not `api-lark-bot`.** Calendar is personal data — always use user identity service.
- **`primary` as calendar_id.** When you don't know the user's calendar ID, use `primary` as a literal string.
- **RSVP decline ≠ busy.** Free/busy queries skip events where the user's RSVP is `decline`. A declined event does not block the time slot.
- **Pagination.** Event list results are paginated. Check `has_more` and use `page_token` for large date ranges.
