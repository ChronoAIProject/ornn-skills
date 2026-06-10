# Sheets — Spreadsheet Operations

All requests use BOT identity:
```
nyxid proxy request api-lark-bot /open-apis/sheets/v3/...
```

To find a spreadsheet by name/keyword first, use Drive/Doc search to get the `spreadsheet_token`. Wiki URLs (`/wiki/TOKEN`) require resolving to `obj_token` via `wiki.spaces.get_node` before use.

---

## Create spreadsheet

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets" -m POST -d '...'`
- **Body:**
```json
{
  "title": "My Spreadsheet",
  "folder_token": "fldbc_xxx"
}
```

`folder_token` is optional. Returns `spreadsheet_token` and `url`.

After bot creation, grant the current user `full_access` via Drive permissions API.

## Get spreadsheet info

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}"`

Returns title, sheet count, sheet IDs, and sheet names.

---

## Read cells

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/values/{range}"`

`range` format: `{sheet_id}!A1:C10` or just `A1:C10` for the first sheet.

Returns `valueRange.values` as a 2D array.

## Write cells (overwrite)

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/values" -m PUT -d '...'`
- **Body:**
```json
{
  "valueRange": {
    "range": "sheetId!A1:C2",
    "values": [["Header1","Header2","Header3"],["val1","val2","val3"]]
  }
}
```

Overwrites the specified range. Does not shift existing data.

## Append rows

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/values_append" -m POST -d '...'`
- **Body:**
```json
{
  "valueRange": {
    "range": "sheetId!A1",
    "values": [["new row col1","new row col2"]]
  },
  "insertDataOption": "INSERT_ROWS"
}
```

Appends after the last row with data. `insertDataOption`: `INSERT_ROWS` (insert rows) or `OVERWRITE` (overwrite empty cells).

---

## Find / search cells

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/sheets/{sheet_id}/find" -m POST -d '...'`
- **Body:**
```json
{
  "find_condition": {
    "range": "sheetId!A1:Z1000",
    "match_case": false,
    "match_entire_cell": false,
    "search_by_regex": false,
    "include_formulas": false
  },
  "find": "search keyword"
}
```

Returns `matched_cells` array with addresses of matching cells.

---

## Export spreadsheet (async)

### Step 1 — Create export task

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/drive/v1/export_tasks" -m POST -d '...'`
- **Body:**
```json
{
  "file_extension": "xlsx",
  "token": "spreadsheet_token",
  "type": "sheet"
}
```

`file_extension`: `xlsx`, `csv`, `pdf`.

### Step 2 — Poll for result

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/drive/v1/export_tasks/{ticket}?token={spreadsheet_token}"`

Poll until `job_status` = 0 (success). Returns `file_token` on success.

### Step 3 — Download

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/drive/v1/export_tasks/{ticket}/download?file_token={file_token}"`

---

## Filters

Filter lifecycle: **create** (with full range) -> **update** (add/change column conditions) -> **delete**. Do not call create again to add a second condition — use update.

### Create filter

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/sheets/{sheet_id}/filter" -m POST -d '...'`
- **Body:**
```json
{
  "range": "sheetId!B1:E200",
  "col": "B",
  "condition": {
    "filter_type": "multiValue",
    "expected": ["value1","value2"]
  }
}
```

`range` must cover all columns you intend to filter. Error `Wrong Filter Value` means a filter already exists — delete first.

### Update filter (add/change a column condition)

- **Method:** PUT
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/sheets/{sheet_id}/filter" -m PUT -d '...'`
- **Body:**
```json
{
  "col": "E",
  "condition": {
    "filter_type": "multiValue",
    "expected": ["target"]
  }
}
```

Only specify the column being added/changed. Error `Excess Limit` means you are adding a duplicate column condition.

### Get filter

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/sheets/{sheet_id}/filter"`

### Delete filter

- **Method:** DELETE
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/sheets/{sheet_id}/filter" -m DELETE`

---

## Permissions

| Operation | Scope |
|-----------|-------|
| Create spreadsheet | `sheets:spreadsheet:create` |
| Read spreadsheet metadata | `sheets:spreadsheet.meta:read` |
| Update spreadsheet metadata | `sheets:spreadsheet.meta:write_only` |
| Read cells/filter | `sheets:spreadsheet:read` |
| Write cells/filter | `sheets:spreadsheet:write_only` |
