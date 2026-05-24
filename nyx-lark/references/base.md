# Base (Bitable) — Multi-dimensional Tables

All requests use BOT identity:
```
nyxid proxy request api-lark-bot /open-apis/bitable/v1/...
```

Wiki links (`/wiki/TOKEN`) must be resolved via `wiki.spaces.get_node` first. When `obj_type=bitable`, use `node.obj_token` as the `app_token`. Never use a wiki token directly as `app_token`.

URL format: `https://{domain}/base/{app_token}?table={table_id}&view={view_id}`

---

## Field Types

Base fields fall into three categories:

| Category | Examples | Writable? |
|----------|---------|-----------|
| **Storage** | Text, Number, Date, Single/Multi-select, Person, URL, Phone, Checkbox, Attachment, Link | Yes |
| **System** | Created time, Modified time, Created by, Modified by, Auto-number | Read-only |
| **Formula/Lookup** | Formula, Lookup | Read-only (definition writable via field API) |

Only write to storage fields in records. Formula/lookup/system fields are output-only.

---

## Base (Workspace) Operations

### Create base

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps" -m POST -d '...'`
- **Body:**
```json
{ "name": "My Base", "folder_token": "fldbc_xxx" }
```

After bot creation, grant current user `full_access` via Drive permissions.

### Get base

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}"`

### Copy base

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/copy" -m POST -d '...'`
- **Body:**
```json
{ "name": "Copy of Base", "folder_token": "fldbc_xxx", "without_content": false }
```

---

## Table Operations

### List tables

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables?page_size=20&page_token=..."`

### Get table

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}"`

### Create table

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables" -m POST -d '...'`
- **Body:**
```json
{
  "table": {
    "name": "TableName",
    "fields": [
      { "field_name": "Title", "type": 1 }
    ]
  }
}
```

Field type codes: 1=Text, 2=Number, 3=Single-select, 4=Multi-select, 5=Date, 7=Checkbox, 11=Person, 15=URL, 17=Attachment, 18=Link (relation), 19=Formula, 20=Lookup.

### Update table

- **Method:** PATCH
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}" -m PATCH -d '...'`
- **Body:** `{ "name": "New Table Name" }`

### Delete table

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}" -m DELETE`

---

## Field Operations

Always fetch field structure before writing records or creating formulas.

### List fields

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields?page_size=100"`

Returns `field_id`, `field_name`, `type`, `property`.

### Get field

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields/{field_id}"`

### Create field

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields" -m POST -d '...'`
- **Body:**
```json
{
  "field_name": "Status",
  "type": 3,
  "property": {
    "options": [
      { "name": "Open", "color": 0 },
      { "name": "Closed", "color": 1 }
    ]
  }
}
```

For formula fields (`type=19`), add `"property": { "formula_expression": "IF([Amount]>100, \"High\", \"Low\")" }`.
For lookup fields (`type=20`), property must include `from`, `select`, and optionally `where`/`aggregate` — read the lookup field guide before creating.

### Update field

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields/{field_id}" -m PUT -d '...'`
- **Body:** same structure as create.

### Delete field

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields/{field_id}" -m DELETE`

---

## Record Operations

Batch limit: **500 records per request**. Use serial calls with 0.5-1 second delay between batches.

### List records

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records?page_size=200&page_token=...&view_id=...&filter=..."`

Max `page_size` is 200. Use pagination for more. Not for aggregation — use data-query instead.

### Get record

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}"`

### Create records (batch)

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_create" -m POST -d '...'`
- **Body:**
```json
{
  "records": [
    { "fields": { "Title": "Row 1", "Amount": 100, "Status": "Open" } },
    { "fields": { "Title": "Row 2", "Amount": 200, "Status": "Closed" } }
  ]
}
```

### Update records (batch)

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_update" -m PUT -d '...'`
- **Body:**
```json
{
  "records": [
    { "record_id": "rec_xxx", "fields": { "Status": "Closed" } }
  ]
}
```

Only include fields to update. Do not include formula/system fields.

### Delete records (batch)

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_delete" -m DELETE -d '...'`
- **Body:**
```json
{ "records": ["rec_xxx", "rec_yyy"] }
```

### Record history

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}/activity_list"`

Returns change history for a specific record. Does not support full-table history scan.

---

## View Operations

### List views

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/views"`

### Get view

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/views/{view_id}"`

### Create view

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/views" -m POST -d '...'`
- **Body:**
```json
{ "view_name": "My View", "view_type": "grid" }
```

View types: `grid`, `kanban`, `gallery`, `gantt`, `form`.

### Delete view

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/views/{view_id}" -m DELETE`

### Set view filter

- **Method:** PATCH
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/views/{view_id}" -m PATCH -d '...'`
- **Body:**
```json
{
  "view_public_level": "Public",
  "filter_info": {
    "conjunction": "and",
    "conditions": [
      {
        "field_id": "fld_xxx",
        "filter_type": "is",
        "value": ["Open"]
      }
    ]
  }
}
```

Workflow: set a filter on a view, then use list records with that `view_id` to get filtered records.

---

## Data Query (Aggregation)

Use for grouping, SUM, COUNT, AVG, MAX, MIN, filtering with aggregation. Do NOT use record-list for aggregation.

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/data_query" -m POST -d '...'`
- **Body (DSL):**
```json
{
  "select": [
    { "field_name": "Status" },
    { "field_name": "Amount", "aggregate": "SUM" }
  ],
  "group_by": [
    { "field_name": "Status" }
  ],
  "filter": {
    "conjunction": "and",
    "conditions": [
      { "field_name": "Amount", "operator": "isGreater", "value": ["0"] }
    ]
  },
  "limit": 100
}
```

- `aggregate` values: `SUM`, `AVG`, `MAX`, `MIN`, `COUNT`, `COUNT_DISTINCT`
- `operator` values: `is`, `isNot`, `contains`, `doesNotContain`, `isEmpty`, `isNotEmpty`, `isGreater`, `isGreaterEqual`, `isLess`, `isLessEqual`
- Field names in DSL must exactly match real field names from field list
- Does not return raw records — use record-list for that

---

## Form Operations

### List forms

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms"`

### Get form

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms/{form_id}"`

### Create form

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms" -m POST -d '...'`
- **Body:** `{ "name": "Survey Form" }`

### Update form

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms/{form_id}" -m PUT -d '...'`

### Delete form

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms/{form_id}" -m DELETE`

### List form questions

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms/{form_id}/questions"`

### Create form question

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms/{form_id}/questions" -m POST -d '...'`

### Update form question

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms/{form_id}/questions/{question_id}" -m PUT -d '...'`

### Delete form question

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/forms/{form_id}/questions/{question_id}" -m DELETE`

---

## Workflow Operations

Read the workflow schema guide before creating or updating workflows. Never guess StepType names.

### List workflows

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/workflows"`

Returns summaries only; use get for full tree structure.

### Get workflow

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/workflows/{workflow_id}"`

### Create workflow

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/workflows" -m POST -d '...'`
- **Body:** requires full JSON tree: trigger node + action nodes. All `type` values must be copied from the schema StepType enum, not guessed from natural language.

### Update workflow

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/workflows/{workflow_id}" -m PUT -d '...'`

### Enable workflow

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/workflows/{workflow_id}/enable" -m POST`

### Disable workflow

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/workflows/{workflow_id}/disable" -m POST`

---

## Advanced Permissions (Roles)

Advanced permissions must be enabled before managing custom roles. Disabling is destructive — all existing custom roles are invalidated.

### Enable advanced permissions

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/set_permission" -m POST -d '...'`
- **Body:** `{ "is_advanced": true }`

Caller must be a Base admin.

### Disable advanced permissions

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/set_permission" -m POST -d '...'`
- **Body:** `{ "is_advanced": false }`

High-risk: existing custom roles all become invalid.

### List roles

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/roles"`

### Get role

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/roles/{role_id}"`

### Create role

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/roles" -m POST -d '...'`
- **Body:** role config with `role_name`, `role_type=custom_role`, and permission maps.

Permission maps: `base_rule_map` (copy/download), `table_rule_map` (table/record/field level), `dashboard_rule_map`, `docx_rule_map`.

### Update role (Delta Merge)

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/roles/{role_id}" -m PUT -d '...'`

`role_name` and `role_type` must always be provided even if not changing.

### Delete role

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/bitable/v1/apps/{app_token}/roles/{role_id}" -m DELETE`

Only custom roles can be deleted. Irreversible.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 1254064 | Date format wrong | Use ms timestamp, not string |
| 1254068 | Hyperlink format wrong | Use `{"text":"..","link":".."}` object |
| 1254066 | Person field wrong | Use `[{"id":"ou_xxx"}]` array |
| 1254045 | Field name not found | Check exact spelling from field-list |
| 1254015 | Field value type mismatch | Fetch field-list, match type |
| 1254104 | Batch over 500 | Split into batches |
| 1254291 | Concurrent write conflict | Serial writes + delay |
| `base_token invalid` | Wrong token (often wiki token) | Resolve via `wiki.spaces.get_node` |

---

## Permissions

| Operation | Scope |
|-----------|-------|
| Full Base read/write | `bitable:bitable` |
| Read-only | `bitable:bitable:readonly` |
