# VC & Minutes — Video Conferences and Meeting Notes

All requests use BOT identity:
```
nyxid proxy request api-lark-bot /open-apis/vc/v1/...
nyxid proxy request api-lark-bot /open-apis/minutes/v1/...
```

---

## Routing: VC vs Calendar

| Scenario | Use |
|----------|-----|
| Ended/past meetings, meeting records | `vc` (this reference) |
| Future meetings, scheduled events, agenda | `lark-calendar` |
| "Today's meetings" | Both: vc for already-ended, calendar for upcoming |

---

## Search Meetings (Ended Only)

Only supports searching **already-ended** meetings. Time range max **1 month per query**.

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/vc/v1/meetings/list_by_no" -m POST -d '...'`

Or use the search endpoint with filters:

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/vc/v1/meetings?page_size=20&page_token=..."`

Key filter params:
- `query_start_time` / `query_end_time` — ms timestamp, max 1-month range
- `keyword` — search keyword
- `organizer_id` — open_id of organizer
- `participant_id` — open_id of participant
- `meeting_room_id` — meeting room ID
- `meeting_status` — `ended` for historical records

Handle pagination: do not stop at page 1. Keep fetching while `has_more=true`.

### Get meeting detail

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/vc/v1/meetings/{meeting_id}?with_participants=true"`

Query params:
- `with_participants=true` — include participant list

Returns: `topic`, `start_time`, `end_time`, `note_id`, `participants`.

---

## Meeting Notes

A meeting generates up to two note documents:

| Token | Content | When to use |
|-------|---------|-------------|
| `note_doc_token` | Smart notes: AI summary + todos + chapters | User asks for "notes", "summary", "todos", "minutes" |
| `verbatim_doc_token` | Verbatim transcript: every sentence with speaker and timestamp | User asks for "transcript", "full record", "who said what" |

If intent is unclear, present both links and let the user choose.

### Get notes for meetings

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/vc/v1/meetings/{meeting_id}/get_meeting_note"`

### Read note content

When user needs the actual content (not just the link):

```bash
# Get note document content
nyxid proxy request api-lark-bot "/open-apis/docx/v1/documents/{note_doc_token}/blocks?page_size=500"

# Get verbatim transcript content
nyxid proxy request api-lark-bot "/open-apis/docx/v1/documents/{verbatim_doc_token}/blocks?page_size=500"
```

### Smart notes cover image

The first `<whiteboard>` block in a `note_doc_token` document is an AI-generated visual summary. Download it when presenting notes to the user:

```bash
# Extract the whiteboard token from the note markdown, then:
nyxid proxy request api-lark-bot "/open-apis/drive/v1/medias/{file_token}/download"
```

Place all downloaded artifacts in `artifact-{meeting_title}/` directory.

### Get document URLs (title + URL only)

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/drive/v1/metas/batch_query" -m POST -d '...'`
- **Body:**
```json
{
  "request_docs": [
    { "doc_type": "docx", "doc_token": "<note_doc_token>" }
  ],
  "with_url": true
}
```

Max 10 documents per request. Returns `title` and `url`.

---

## Minutes (妙记)

Minutes are recordings or uploaded audio/video with AI transcription. Identified by `minute_token`.

Extract `minute_token` from URL: `https://{domain}/minutes/{minute_token}`

### Get minute info

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/minutes/v1/minutes/{minute_token}"`

Returns: `title`, `cover`, `duration` (ms), `owner_id`, `url`.

This returns metadata only. For note content (transcript, summary, todos, chapters), use the meeting notes endpoints.

### Get minute statistics

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/minutes/v1/minutes/{minute_token}/statistics"`

### Download minute media

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/minutes/v1/minutes/{minute_token}/media/download"`

Returns a temporary download URL (valid 1 day).

---

## Resource Hierarchy

```
Meeting (meeting_id)
├── Note (note_id)
│   ├── note_doc_token  → AI summary + todos + chapters
│   ├── verbatim_doc_token → verbatim transcript (speaker + timestamp)
│   └── SharedDoc (documents shared during meeting)
└── Minutes (minute_token) — from recording or uploaded media
    ├── Transcript
    ├── Summary
    ├── Todos
    └── Chapters
```

---

## Permissions

| Operation | Scope |
|-----------|-------|
| Search meetings | `vc:meeting.search:read` |
| Get meeting detail | `vc:meeting.meetingevent:read` |
| Get meeting notes (by meeting-id) | `vc:meeting.meetingevent:read`, `vc:note:read` |
| Get meeting notes (by minute-token) | `vc:note:read`, `minutes:minutes:readonly`, `minutes:minutes.artifacts:read`, `minutes:minutes.transcript:export` |
| Get meeting notes (by calendar-event-id) | `calendar:calendar:read`, `calendar:calendar.event:read`, `vc:meeting.meetingevent:read`, `vc:note:read` |
| Get minute metadata | `minutes:minutes:readonly` |
| Download minute media | `minutes:minutes.media:export` |
