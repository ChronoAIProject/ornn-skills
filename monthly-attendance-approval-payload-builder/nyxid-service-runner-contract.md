# NyxID service runner contract

This contract defines how `monthly-attendance-approval-payload-builder` runner mode uses a NyxID service as the configuration and credential boundary.

## Service identity

The caller provides a NyxID service slug:

```json
{
  "serviceSlug": "monthly-attendance-cn",
  "mode": "approval"
}
```

The service must resolve to a Lark/OpenAPI-compatible endpoint and hold the Lark bot credential. The runner must use the same service slug for all Bitable reads, approval submission, and message sends.

## Configuration source

Read service details with:

```bash
nyxid service show <serviceSlug> --output json
```

Extract attendance configuration from service default headers. Header names are case-insensitive. Support both `default_request_headers` and `default_headers` shapes.

Required for approval mode:

| Header | Meaning |
|---|---|
| `x-attendance-bitable-app-token` | Lark Bitable app/base token |
| `x-attendance-table-id` | Attendance records table ID |
| `x-attendance-doc-url` | Attendance document URL placed in the approval form |
| `x-attendance-approval-code` | Lark approval definition code |
| `x-attendance-submitter-id` | Lark user ID used as approval submitter |

Required for reminder mode:

| Header | Meaning |
|---|---|
| `x-attendance-notify-user-id` | Lark user ID to receive the reminder DM |

Optional headers:

| Header | Default | Meaning |
|---|---:|---|
| `x-attendance-notify-user-id` | unset | Lark user ID for post-approval notification. Required for reminder mode. |
| `x-attendance-year` | current year | Attendance year. |
| `x-attendance-month` | current month | Attendance month. |
| `x-attendance-month-label` | `<year>年<month>月` | Month label used to filter records. |
| `x-attendance-records-already-filtered` | `false` | Whether Bitable records are already filtered for the month. |
| `x-attendance-widget-desc-id` | contract default | Approval textarea widget ID. |
| `x-attendance-widget-link-id` | contract default | Approval link/input widget ID. |
| `x-attendance-page-size` | `500` | Bitable page size per request. |

## Proxy reads

Fetch records through NyxID proxy, never direct Lark HTTP:

```bash
nyxid proxy request <serviceSlug>   '/open-apis/bitable/v1/apps/<appToken>/tables/<tableId>/records?page_size=<pageSize>'   -m GET
```

Read all pages when Lark returns `data.has_more = true` and `data.page_token`.

Extract records from `response.data.items`.

## Approval submission

Submit approval through NyxID proxy:

```bash
nyxid proxy request <serviceSlug>   '/open-apis/approval/v4/instances'   -m POST   -d '<payload.lark.approvalBody JSON>'
```

Capture `instance_code` from the response when present.

## Notification and reminder send

Send through NyxID proxy:

```bash
nyxid proxy request <serviceSlug>   '/open-apis/im/v1/messages?receive_id_type=user_id'   -m POST   -d '<message body JSON>'
```

Do not include downstream Authorization headers or raw Lark credentials.

## Runner output

Return one JSON object:

```json
{
  "serviceSlug": "monthly-attendance-cn",
  "mode": "approval",
  "dryRun": false,
  "submitted": true,
  "notified": true,
  "instanceCode": "optional",
  "approvalResponse": {},
  "notificationResponse": {},
  "payload": {}
}
```

If required configuration is missing, return:

```json
{
  "needs_more_information": true,
  "missing": ["x-attendance-table-id"]
}
```
