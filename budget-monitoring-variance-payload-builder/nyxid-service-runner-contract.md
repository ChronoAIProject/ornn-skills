# NyxID service runner contract

This contract defines how `budget-monitoring-variance-payload-builder` runner mode uses a NyxID service as the configuration and credential boundary.

## Service identity

The caller provides a NyxID service slug:

```json
{
  "serviceSlug": "budget-monitoring-p2"
}
```

The service must resolve to a Lark/OpenAPI-compatible endpoint and hold the Lark bot credential. The runner must use the same service slug for all Bitable reads and message sends.

## Configuration source

Read service details with:

```bash
nyxid service show <serviceSlug> --output json
```

Extract budget configuration from service default headers. Header names are case-insensitive. Values may be plain strings or structured objects depending on CLI/API output; normalize to the string value before use.

Required headers:

| Header | Meaning |
|---|---|
| `x-budget-bitable-app-token` | Lark Bitable app token/base token |
| `x-budget-core-budget-table-id` | Core planned budget table ID |
| `x-budget-core-actual-table-id` | Core actual spend table ID |
| `x-budget-aelf-budget-table-id` | aelf planned budget table ID |
| `x-budget-aelf-actual-table-id` | aelf actual spend table ID |

Optional headers:

| Header | Default | Meaning |
|---|---:|---|
| `x-budget-receive-id` | unset | Lark receiver ID. If absent, build payload but do not send. |
| `x-budget-receive-id-type` | `open_id` | Lark receive_id_type for message send. |
| `x-budget-period` | derived from data cutoff | Report period label. |
| `x-budget-currency` | `USD` | Currency label. |
| `x-budget-watch-threshold-percent` | `80` | Watch threshold. |
| `x-budget-alert-threshold-percent` | `100` | Warning threshold. |
| `x-budget-critical-threshold-percent` | `120` | Critical threshold. |
| `x-budget-page-size` | `500` | Bitable page size per request. |

## Proxy reads

Fetch records through NyxID proxy, never direct Lark HTTP:

```bash
nyxid proxy request <serviceSlug>   '/open-apis/bitable/v1/apps/<appToken>/tables/<tableId>/records?page_size=<pageSize>'   -m GET
```

Read all pages when Lark returns `data.has_more = true` and `data.page_token`.

Extract records from `response.data.items`.

## Payload build

Call the payload builder with:

```json
{
  "coreBudgetRecords": [],
  "coreActualRecords": [],
  "aelfBudgetRecords": [],
  "aelfActualRecords": [],
  "period": "optional",
  "currency": "USD",
  "watchThresholdPercent": 80,
  "alertThresholdPercent": 100,
  "criticalThresholdPercent": 120,
  "receiveId": "optional",
  "receiveIdType": "open_id"
}
```

## Message send

Only send when `x-budget-receive-id` is configured and payload has `lark.body`.

Send through NyxID proxy:

```bash
nyxid proxy request <serviceSlug>   '/open-apis/im/v1/messages?receive_id_type=<receiveIdType>'   -m POST   -d '<payload.lark.body JSON>'
```

Do not include downstream Authorization headers or raw Lark credentials.

## Runner output

Return one JSON object:

```json
{
  "serviceSlug": "budget-monitoring-p2",
  "sent": true,
  "messageId": "optional",
  "severity": "critical",
  "summary": "Budget variance summary for ...",
  "dataCutoff": "2026-05-12",
  "totals": {},
  "highlights": [],
  "sendResponse": {}
}
```

If `receiveId` is absent, return `sent: false` and include the built payload.

If required configuration is missing, return:

```json
{
  "needs_more_information": true,
  "missing": ["x-budget-core-budget-table-id"]
}
```
