# Drive — Files & Folders

All Drive API calls use **BOT identity**:

```bash
nyxid proxy request api-lark-bot /open-apis/drive/v1/...
```

---

## API Reference

### List files

List contents of a folder.

- **Method:** GET
- **Path:** `/open-apis/drive/v1/files`

**Query params:**

| Field | Required | Description |
|-------|----------|-------------|
| `folder_token` | No | Folder token. Omit for root folder. |
| `page_size` | No | Max items per page (default 10, max 200) |
| `page_token` | No | Pagination cursor |

```bash
nyxid proxy request api-lark-bot \
  "/open-apis/drive/v1/files?folder_token=fldbc_xxx&page_size=50"
```

**Response:**

```json
{
  "files": [
    {
      "token": "boxbc_xxx",
      "name": "report.pdf",
      "type": "file",
      "parent_token": "fldbc_xxx",
      "created_time": "1700000000",
      "modified_time": "1700001000",
      "owner_id": "ou_xxx",
      "url": "https://example.feishu.cn/drive/file/boxbc_xxx"
    }
  ],
  "next_page_token": "...",
  "has_more": false
}
```

---

### Upload file

Upload a local file to a Drive folder. This is a binary operation requiring multipart/form-data.

**All-in-one upload (small files):**

- **Method:** POST
- **Path:** `/open-apis/drive/v1/files/upload_all`

Since `nyxid proxy request` sends JSON, use curl with the NyxID proxy URL for binary uploads:

```bash
# For binary upload, use curl with the proxy URL:
curl -X POST "https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/files/upload_all" \
  -H "Authorization: Bearer $NYXID_TOKEN" \
  -F "file=@./report.pdf" \
  -F "file_name=report.pdf" \
  -F "parent_type=explorer" \
  -F "parent_node=fldbc_xxx" \
  -F "size=1048576"
```

```bash
# With a custom name:
curl -X POST "https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/files/upload_all" \
  -H "Authorization: Bearer $NYXID_TOKEN" \
  -F "file=@./report.pdf" \
  -F "file_name=Q2 Summary.pdf" \
  -F "parent_type=explorer" \
  -F "parent_node=fldbc_xxx" \
  -F "size=1048576"
```

**Large file upload (prepare + part + finish):**

Step 1 — Prepare:

```bash
nyxid proxy request api-lark-bot /open-apis/drive/v1/files/upload_prepare \
  -m POST -d '{
    "file_name": "report.pdf",
    "parent_type": "explorer",
    "parent_node": "fldbc_xxx",
    "size": 20971520
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `file_name` | Yes | Target file name |
| `parent_type` | Yes | `"explorer"` for Drive folder |
| `parent_node` | Yes | Destination folder token |
| `size` | Yes | File size in bytes |

Step 2 — Upload parts (binary, use curl):

```bash
curl -X POST "https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/files/upload_part" \
  -H "Authorization: Bearer $NYXID_TOKEN" \
  -F "upload_id=UPLOAD_ID" \
  -F "seq=0" \
  -F "size=4194304" \
  -F "file=@./part_0.bin"
```

Step 3 — Finish:

```bash
nyxid proxy request api-lark-bot /open-apis/drive/v1/files/upload_finish \
  -m POST -d '{
    "upload_id": "UPLOAD_ID",
    "block_num": 5
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `upload_id` | Yes | Upload ID from prepare step |
| `block_num` | Yes | Number of uploaded blocks |

**Response:**

```json
{
  "file_token": "boxbc_xxx",
  "url": "https://example.feishu.cn/drive/file/boxbc_xxx"
}
```

---

### Download file

Download a Drive file to local disk. This is a binary operation — use curl with the NyxID proxy URL.

- **Method:** GET
- **Path:** `/open-apis/drive/v1/files/:file_token/download`

```bash
# Download to a specific file:
curl -o ./report.pdf \
  "https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/files/boxbc_xxx/download" \
  -H "Authorization: Bearer $NYXID_TOKEN"

# Download with original name (check Content-Disposition header):
curl -OJ \
  "https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/files/boxbc_xxx/download" \
  -H "Authorization: Bearer $NYXID_TOKEN"
```

Extract `file_token` from a Drive URL:

```
https://xxx.feishu.cn/drive/file/boxbc_xxx
                              ^^^^^^^^^^^^
                              file_token
```

---

### Create folder

Create a new folder inside an existing Drive folder.

- **Method:** POST
- **Path:** `/open-apis/drive/v1/files/create_folder`

```bash
nyxid proxy request api-lark-bot /open-apis/drive/v1/files/create_folder \
  -m POST -d '{"name":"2024 Archive","folder_token":"fldbc_xxx"}'
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Folder name |
| `folder_token` | Yes | Parent folder token |

**Response:**

```json
{
  "token": "fldbc_yyy",
  "url": "https://example.feishu.cn/drive/folder/fldbc_yyy"
}
```

---

### Copy file

Copy a file to another location in Drive.

- **Method:** POST
- **Path:** `/open-apis/drive/v1/files/:file_token/copy`

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/boxbc_xxx/copy" \
  -m POST -d '{
    "name": "report_copy.pdf",
    "type": "file",
    "folder_token": "fldbc_yyy"
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Name for the copy |
| `type` | Yes | Source file type: `file` / `docx` / `doc` / `sheet` / `bitable` / `mindnote` / `slides` |
| `folder_token` | Yes | Destination folder token |

**Response:**

```json
{
  "file": {
    "token": "boxbc_zzz",
    "name": "report_copy.pdf",
    "type": "file"
  }
}
```

---

### Move file

Move a file or folder to a different location. Folder moves are async.

- **Method:** POST
- **Path:** `/open-apis/drive/v1/files/:file_token/move`

```bash
# Move a file
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/boxbc_xxx/move" \
  -m POST -d '{"type":"file","folder_token":"fldbc_yyy"}'

# Move a docx document
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/doxcn_xxx/move" \
  -m POST -d '{"type":"docx","folder_token":"fldbc_yyy"}'

# Move a folder (async — returns task_id for polling)
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/fldbc_xxx/move" \
  -m POST -d '{"type":"folder","folder_token":"fldbc_yyy"}'
```

**Supported types:** `file` / `docx` / `doc` / `sheet` / `bitable` / `mindnote` / `slides` / `folder`

If the folder move does not complete immediately, the response returns a `task_id`. Poll for completion:

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/task_check?task_id=TASK_ID"
```

---

### Delete file

Delete a file or folder (async for folders).

- **Method:** DELETE
- **Path:** `/open-apis/drive/v1/files/:file_token`

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/boxbc_xxx?type=file" \
  -m DELETE
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | File type (same values as move) |

---

### Get file metadata

Retrieve metadata for one or more files by token.

- **Method:** POST
- **Path:** `/open-apis/drive/v1/metas/batch_query`

```bash
nyxid proxy request api-lark-bot /open-apis/drive/v1/metas/batch_query \
  -m POST -d '{
    "request_docs": [
      {"doc_token":"boxbc_xxx","doc_type":"file"},
      {"doc_token":"doxcn_xxx","doc_type":"docx"}
    ],
    "with_url": true
  }'
```

**Response:**

```json
{
  "metas": [
    {
      "doc_token": "boxbc_xxx",
      "doc_type": "file",
      "title": "report.pdf",
      "owner_id": "ou_xxx",
      "create_time": "1700000000",
      "latest_modify_time": "1700001000",
      "url": "https://example.feishu.cn/drive/file/boxbc_xxx"
    }
  ]
}
```

**Required scope:** `drive:drive.metadata:readonly`

---

### Add comment

Add a full-document or selection-based (local) comment to a document.

- **Method:** POST
- **Path:** `/open-apis/drive/v1/files/:file_token/comments`

**Full-document comment** (omit `anchor`):

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/doxcn_xxx/comments?file_type=docx" \
  -m POST -d '{
    "reply_list": {
      "replies": [{
        "content": {
          "elements": [{"type":"text","text":"Please add release notes"}]
        }
      }]
    },
    "is_whole": true
  }'
```

**Selection-based (local) comment** (include `anchor.block_id`):

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/doxcn_xxx/comments?file_type=docx" \
  -m POST -d '{
    "reply_list": {
      "replies": [{
        "content": {
          "elements": [{"type":"text","text":"Please elaborate on this step"}]
        }
      }]
    },
    "anchor": {
      "block_id": "BLOCK_ID"
    }
  }'
```

**Rich content: text + @user + link:**

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/files/doxcn_xxx/comments?file_type=docx" \
  -m POST -d '{
    "reply_list": {
      "replies": [{
        "content": {
          "elements": [
            {"type":"text","text":"Please "},
            {"type":"mention_user","text":"ou_xxx"},
            {"type":"text","text":" review, see "},
            {"type":"link","text":"https://example.com"}
          ]
        }
      }]
    },
    "is_whole": true
  }'
```

**Body fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `file_type` | Yes (query param) | `"docx"` or `"doc"` |
| `reply_list.replies[].content.elements` | Yes | Array of `{type, text}` elements. `type`: `text` / `mention_user` / `link` |
| `anchor.block_id` | No | Omit for full-document comment; include for selection-based comment |
| `is_whole` | No | `true` for full-document comment |

**Comment modes:**

| Mode | Requirement | Supported doc types |
|------|-------------|---------------------|
| Full-document (`is_whole: true`) | Omit `anchor` | `docx`, `doc`, wiki resolving to `doc`/`docx` |
| Selection-based (local) | Include `anchor.block_id` | `docx` and wiki resolving to `docx` only |

**Wiki links:** A `/wiki/TOKEN` URL cannot be used directly as `file_token`. Resolve it first (see Common Pitfalls).

---

### List comments

Retrieve paginated comment cards for a document.

- **Method:** GET
- **Path:** `/open-apis/drive/v1/files/:file_token/comments`

```bash
nyxid proxy request api-lark-bot \
  "/open-apis/drive/v1/files/doxcn_xxx/comments?file_type=docx&page_size=50"
```

**Query params:**

| Field | Required | Description |
|-------|----------|-------------|
| `file_type` | Yes | `"docx"` or `"doc"` |
| `is_whole` | No | Filter by full-document comments (`true`) or selection-based (`false`) |
| `is_solved` | No | Filter resolved comments |
| `page_size` | No | Default 10, max 100 |
| `page_token` | No | Pagination cursor |

**Response:**

```json
{
  "items": [
    {
      "comment_id": "cmt_xxx",
      "is_whole": false,
      "is_solved": false,
      "create_time": 1700000000,
      "reply_list": {
        "replies": [
          {
            "reply_id": "rep_xxx",
            "content": { "elements": [{"type":"text","text":"First reply (= the comment itself)"}] },
            "create_time": 1700000000
          }
        ],
        "has_more": false
      }
    }
  ],
  "has_more": false,
  "page_token": "..."
}
```

**Counting semantics:**

- **Number of comment cards** = `items.length`
- **Number of replies** (excluding original comment) = sum of all `reply_list.replies.length` minus `items.length`
- **Total interactions** = sum of all `reply_list.replies.length`
- If `item.has_more=true`, paginate that card's replies before counting (see Reply to comment)

---

### Reply to comment

Add a reply to an existing comment card.

- **Method:** POST
- **Path:** `/open-apis/drive/v1/files/:file_token/comments/:comment_id/replies`

```bash
nyxid proxy request api-lark-bot \
  "/open-apis/drive/v1/files/doxcn_xxx/comments/cmt_xxx/replies" \
  -m POST -d '{
    "content": {
      "elements": [{"type":"text","text":"Reply content"}]
    }
  }'
```

**Restrictions (check before replying):**

- `is_whole=true` (full-document comment) -- replies not supported
- `is_solved=true` (resolved comment) -- replies not supported

Do not automatically find another comment to reply to if the target is restricted; surface the restriction to the user instead.

---

### Export document (async with polling)

Export a `doc` / `docx` / `sheet` / `bitable` to a downloadable file. The operation is async: create task, poll, download.

**Step 1 -- Create export task:**

- **Method:** POST
- **Path:** `/open-apis/drive/v1/export_tasks`

```bash
nyxid proxy request api-lark-bot /open-apis/drive/v1/export_tasks \
  -m POST -d '{
    "file_extension": "pdf",
    "token": "DOCX_TOKEN",
    "type": "docx"
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `file_extension` | Yes | Target format (`pdf` / `docx` / `xlsx` / `csv` / `markdown`) |
| `token` | Yes | Source document token |
| `type` | Yes | Source document type (`doc` / `docx` / `sheet` / `bitable`) |
| `sub_id` | Conditional | Required when exporting sheet/bitable as CSV |

**Supported format matrix:**

| `type` | `file_extension` |
|--------|------------------|
| `doc` | `docx` / `pdf` |
| `docx` | `docx` / `pdf` / `markdown` |
| `sheet` | `xlsx` / `csv` |
| `bitable` | `xlsx` / `csv` |

**Step 2 -- Poll task status:**

```bash
nyxid proxy request api-lark-bot \
  "/open-apis/drive/v1/export_tasks/TICKET?token=DOCX_TOKEN"
```

Poll until `result.job_status == 0` (success). The response contains `result.file_token`.

**Step 3 -- Download the exported file (binary, use curl):**

```bash
curl -o ./export.pdf \
  "https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/export_tasks/file/EXPORTED_FILE_TOKEN/download" \
  -H "Authorization: Bearer $NYXID_TOKEN"
```

**Examples:**

```bash
# Export docx as PDF
nyxid proxy request api-lark-bot /open-apis/drive/v1/export_tasks \
  -m POST -d '{"file_extension":"pdf","token":"DOCX_TOKEN","type":"docx"}'

# Export sheet as xlsx
nyxid proxy request api-lark-bot /open-apis/drive/v1/export_tasks \
  -m POST -d '{"file_extension":"xlsx","token":"SHEET_TOKEN","type":"sheet"}'

# Export sheet as CSV (sub_id required)
nyxid proxy request api-lark-bot /open-apis/drive/v1/export_tasks \
  -m POST -d '{"file_extension":"csv","token":"SHEET_TOKEN","type":"sheet","sub_id":"SUB_ID"}'
```

---

### Import file as cloud document

Import a local file and convert it to a Lark cloud document (`docx` / `sheet` / `bitable`).

The import flow is: upload file (binary) -> create import task -> poll for completion.

**Step 1 -- Upload the file (binary, use curl):**

```bash
curl -X POST "https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/files/upload_all" \
  -H "Authorization: Bearer $NYXID_TOKEN" \
  -F "file=@./README.md" \
  -F "file_name=README.md" \
  -F "parent_type=explorer" \
  -F "parent_node=FOLDER_TOKEN" \
  -F "size=2048"
```

**Step 2 -- Create import task:**

- **Method:** POST
- **Path:** `/open-apis/drive/v1/import_tasks`

```bash
nyxid proxy request api-lark-bot /open-apis/drive/v1/import_tasks \
  -m POST -d '{
    "file_extension": "md",
    "file_token": "FILE_TOKEN_FROM_UPLOAD",
    "type": "docx",
    "file_name": "README",
    "point": {
      "mount_type": 1,
      "mount_key": "FOLDER_TOKEN"
    }
  }'
```

**Step 3 -- Poll import task:**

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/import_tasks/TICKET"
```

On success, returns `result.token` and `result.url` for the created cloud document.

**Supported conversions:**

| Local extension | Import as |
|-----------------|-----------|
| `.docx` `.doc` `.txt` `.md` `.html` | `docx` |
| `.xlsx` `.csv` | `sheet` or `bitable` |
| `.xls` | `sheet` |

**Size limits:** `.docx`/`.doc` -> 600 MB; `.xlsx` -> 800 MB; `.txt`/`.md`/`.html`/`.csv`/`.xls` -> 20 MB; `.csv` to `bitable` -> 100 MB.

---

### File permissions / members

**Add a collaborator:**

- **Method:** POST
- **Path:** `/open-apis/drive/v1/permissions/:token/members`

```bash
nyxid proxy request api-lark-bot "/open-apis/drive/v1/permissions/doxcn_xxx/members?type=docx" \
  -m POST -d '{
    "member_type": "openid",
    "member_id": "ou_xxx",
    "perm": "full_access",
    "type": "docx"
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `member_type` | Yes | `"openid"` / `"unionid"` / `"email"` / `"departmentid"` |
| `member_id` | Yes | ID value |
| `perm` | Yes | `"view"` / `"edit"` / `"full_access"` |
| `type` | Yes | File type (e.g. `"docx"`) |

**Check if user has permission:**

- **Method:** GET
- **Path:** `/open-apis/drive/v1/permissions/:token/members/auth`

```bash
nyxid proxy request api-lark-bot \
  "/open-apis/drive/v1/permissions/doxcn_xxx/members/auth?type=docx&action=edit"
```

**Required scopes:**

| Operation | Scope |
|-----------|-------|
| Add member | `docs:permission.member:create` |
| Check permission | `docs:permission.member:auth` |
| Transfer owner | `docs:permission.member:transfer` |

---

## Common Pitfalls

**Comment modes: full-document vs selection-based**

- Full-document comments (`is_whole=true`) are created by omitting `anchor`. They work on `docx`, `doc`, and wiki links resolving to either.
- Selection-based comments require `anchor.block_id`. They only work on `docx` (or wiki resolving to `docx`). Old `doc` URLs do not support selection-based comments.

**Resolved comments and full-document comments do not support replies**

Before replying to a comment, check `is_solved` and `is_whole`. If either is `true`, surface the restriction to the user -- do not silently pick a different comment.

**Export is async: create task -> poll -> download**

Always handle the full three-step flow:

1. `POST /open-apis/drive/v1/export_tasks` -- create the task, get `ticket`
2. `GET /open-apis/drive/v1/export_tasks/TICKET?token=SOURCE_TOKEN` -- poll until `job_status == 0`, get `file_token`
3. Download the exported file via curl (binary)

**Wiki links must be resolved before use**

A `/wiki/TOKEN` URL cannot be used directly as `file_token`. Resolve it first:

```bash
nyxid proxy request api-lark-bot "/open-apis/wiki/v2/spaces/get_node?token=WIKI_TOKEN"
# Returns node.obj_type and node.obj_token — use obj_token for subsequent Drive/Doc API calls
```

**Comment counting semantics**

List comments returns comment *cards* (`items`), not flat messages. Each card's first reply is the comment itself. Count cards as `items.length`; count replies as `sum(replies.length) - items.length`; count total interactions as `sum(replies.length)`. If a card has `has_more=true`, paginate that card's replies before summing.

**Import/export type constraints**

Extension and target type must match. `.md` files cannot be imported as `sheet`. `.csv` cannot be imported as `docx`. Mismatch returns a validation error before upload.

**Binary operations require curl**

The `nyxid proxy request` command sends JSON bodies. For operations that require `multipart/form-data` (file upload) or return binary streams (file download, export download), use curl with the NyxID proxy URL directly:

```
https://nyx-api.chrono-ai.fun/api/v1/proxy/s/api-lark-bot/open-apis/drive/v1/...
```

Pass `Authorization: Bearer $NYXID_TOKEN` as the auth header.
