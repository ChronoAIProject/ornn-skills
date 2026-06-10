# Approval — Instances & Tasks

All requests use BOT identity:
```
nyxid proxy request api-lark-bot /open-apis/approval/v4/...
```

---

## Get instance

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/approval/v4/instances/{instance_id}"`

Returns: `approval_name`, `status`, `form`, `timeline`, `start_time`, `end_time`.

## Cancel instance

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/approval/v4/instances/{instance_id}/cancel" -m POST -d '...'`
- **Body:**
```json
{
  "user_id": "ou_xxx",
  "approval_code": "approval_code"
}
```

---

## Approve task

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/approval/v4/tasks/{task_id}/approve" -m POST -d '...'`
- **Body:**
```json
{
  "user_id": "ou_xxx",
  "approval_code": "approval_code",
  "comment": "Approved"
}
```

## Reject task

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/approval/v4/tasks/{task_id}/reject" -m POST -d '...'`
- **Body:**
```json
{
  "user_id": "ou_xxx",
  "approval_code": "approval_code",
  "comment": "Rejected — reason"
}
```

## Transfer task

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/approval/v4/tasks/{task_id}/transfer" -m POST -d '...'`
- **Body:**
```json
{
  "user_id": "ou_xxx",
  "approval_code": "approval_code",
  "transfer_user_id": "ou_yyy",
  "comment": "Transferring to team lead"
}
```

---

## Query user tasks

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/approval/v4/tasks/query?user_id=ou_xxx&topic=pending&page_size=20&page_token=..."`

Query params:
- `user_id` — open_id of the user
- `topic` — `pending`, `approved`, `rejected`, `transferred`, `done`
- `page_size`, `page_token` — pagination

---

## Permissions

| Operation | Scope |
|-----------|-------|
| Get instance | `approval:instance:read` |
| Cancel instance | `approval:instance` |
| Approve/reject/transfer task | `approval:task` |
| Query tasks | `approval:task:read` |
