# Task — Manage Tasks & Tasklists

All requests use BOT identity:
```
nyxid proxy request api-lark-bot /open-apis/task/v2/...
```

## Constraints

- `start` must be <= `due` if both are set
- `reminder` and `repeat_rule` require `due` to be set first
- Bot identity cannot add members across tenants
- Times are ISO 8601 or ms timestamp; `YYYY-MM-DD` sets all-day

---

## Create task

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks" -m POST -d '...'`
- **Body:**
```json
{
  "summary": "Task title",
  "description": "Optional detail",
  "due": { "timestamp": "1745000000000", "is_all_day": false },
  "start": { "timestamp": "1744900000000", "is_all_day": false },
  "members": [{ "id": "ou_xxx", "type": "assignee" }],
  "tasklist_activity_id": "guid-of-tasklist"
}
```

## Update task

- **Method:** PATCH
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}" -m PATCH -d '...'`
- **Body:** same fields as create; only include fields to change. Also pass `update_fields` array listing modified field names.

## Complete task

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}/complete" -m POST`

No body required.

## Reopen task

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}/uncomplete" -m POST`

No body required.

## Get task

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}"`

## List tasks

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks?page_size=50&page_token=..."`

Returns tasks created by or assigned to the caller.

## Create subtask

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{parent_task_id}/subtasks" -m POST -d '...'`
- **Body:** same as task create.

## List subtasks

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{parent_task_id}/subtasks"`

---

## Assign members

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}/add_members" -m POST -d '...'`
- **Body:**
```json
{
  "members": [
    { "id": "ou_xxx", "type": "assignee" },
    { "id": "ou_yyy", "type": "follower" }
  ]
}
```

## Remove members

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}/remove_members" -m POST -d '...'`
- **Body:** same structure as add_members.

---

## Add reminder

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}/reminders" -m POST -d '...'`
- **Body:**
```json
{ "relative_fire_minute": 30 }
```

Requires task to have a `due` date set first.

`relative_fire_minute`: minutes before due time (e.g., 30 = 30 min before, 0 = at due time, -60 = 60 min after).

## List reminders

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}/reminders"`

## Delete reminder

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasks/{task_id}/reminders/{reminder_id}" -m DELETE`

---

## Create tasklist

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists" -m POST -d '...'`
- **Body:**
```json
{ "name": "My Tasklist" }
```

## List tasklists

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists"`

## Get tasklist

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists/{tasklist_guid}"`

## Update tasklist

- **Method:** PATCH
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists/{tasklist_guid}" -m PATCH -d '...'`
- **Body:** `{ "name": "New name" }` plus `update_fields`.

## Add tasks to tasklist

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists/{tasklist_guid}/add_tasks" -m POST -d '...'`
- **Body:**
```json
{ "tasks": [{ "task_guid": "task-id-xxx" }] }
```

## List tasks in tasklist

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists/{tasklist_guid}/tasks"`

## Add tasklist members

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists/{tasklist_guid}/add_members" -m POST -d '...'`
- **Body:**
```json
{ "members": [{ "id": "ou_xxx", "role": "editor" }] }
```

Roles: `owner`, `editor`, `viewer`.

## Remove tasklist members

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/task/v2/tasklists/{tasklist_guid}/remove_members" -m POST -d '...'`

---

## Permissions

| Operation | Scope |
|-----------|-------|
| Create/update/delete task | `task:task:write` |
| Read task | `task:task:read` |
| Create/update/delete tasklist | `task:tasklist:write` |
| Read tasklist | `task:tasklist:read` |
| Add/remove task members | `task:task:write` |
| Add/remove tasklist members | `task:tasklist:write` |
