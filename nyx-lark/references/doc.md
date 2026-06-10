# Doc — Cloud Documents

All Doc API calls use **USER identity**:

```bash
nyxid proxy request api-lark /docx/v1/...
```

---

## API Reference

### Create document

Create a new Lark cloud document.

**Method/Path:** `POST /docx/v1/documents`

```bash
# Create in a specific Drive folder
nyxid proxy request api-lark /docx/v1/documents \
  -m POST -d '{"title":"Project Plan","folder_token":"fldcnXXXX"}'

# Create without specifying folder (personal space root)
nyxid proxy request api-lark /docx/v1/documents \
  -m POST -d '{"title":"Meeting Notes"}'
```

**Body:**

| Field | Required | Description |
|-------|----------|-------------|
| `title` | No | Document title |
| `folder_token` | No | Drive folder token; omit for personal space root |

**Response:**

```json
{
  "code": 0,
  "data": {
    "document": {
      "document_id": "doxcnXXXXXXXXXX",
      "revision_id": 1,
      "title": "Project Plan"
    }
  }
}
```

**To create under a wiki node**, create the document first, then use the Wiki API to move it:

```bash
# Step 1: Create the document
nyxid proxy request api-lark /docx/v1/documents \
  -m POST -d '{"title":"Tech Spec"}'

# Step 2: Move into wiki space as a node
nyxid proxy request api-lark /wiki/v2/spaces/7000000000000000000/nodes \
  -m POST -d '{"obj_type":"docx","obj_token":"doxcnXXXXXXXXXX","parent_node_token":"wikcnXXXX"}'
```

---

### Get document metadata

Retrieve document title and revision info.

**Method/Path:** `GET /docx/v1/documents/{document_id}`

```bash
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX
```

**Response:**

```json
{
  "code": 0,
  "data": {
    "document": {
      "document_id": "doxcnXXXXXXXXXX",
      "revision_id": 5,
      "title": "Project Plan"
    }
  }
}
```

---

### Get document raw content

Fetch the full content of a document.

**Method/Path:** `GET /docx/v1/documents/{document_id}/raw_content`

```bash
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX/raw_content
```

**Response:**

```json
{
  "code": 0,
  "data": {
    "content": "Document Title\nSection heading\nBody text..."
  }
}
```

---

### List blocks

List all blocks in a document, with pagination.

**Method/Path:** `GET /docx/v1/documents/{document_id}/blocks`

```bash
# First page
nyxid proxy request api-lark "/docx/v1/documents/doxcnXXXXXXXXXX/blocks?page_size=50"

# Paginated
nyxid proxy request api-lark "/docx/v1/documents/doxcnXXXXXXXXXX/blocks?page_size=50&page_token=xxx"
```

**Query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `document_revision_id` | No | Specific revision; default latest |
| `page_size` | No | Max blocks per page (default 500) |
| `page_token` | No | Pagination cursor |

**Response:**

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "block_id": "doxcnXXX_blk_yyy",
        "block_type": 2,
        "text": { "elements": [{ "text_run": { "content": "Hello" } }] }
      }
    ],
    "has_more": false,
    "page_token": ""
  }
}
```

**Block types:** 1 = Page, 2 = Text, 3 = Heading1, 4 = Heading2, ..., 14 = Table, 18 = Image, 23 = File, 27 = Code, etc.

---

### Get a single block

**Method/Path:** `GET /docx/v1/documents/{document_id}/blocks/{block_id}`

```bash
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX/blocks/doxcnXXX_blk_yyy
```

---

### Update a block

Update content or properties of an existing block.

**Method/Path:** `PATCH /docx/v1/documents/{document_id}/blocks/{block_id}`

```bash
# Update a text block's content
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX/blocks/doxcnXXX_blk_yyy \
  -m PATCH -d '{
    "update_text_elements": {
      "elements": [
        {
          "text_run": {
            "content": "Updated content here"
          }
        }
      ]
    }
  }'
```

**Body fields (pick one operation per request):**

| Field | Description |
|-------|-------------|
| `update_text_elements` | Replace text block content with new elements |
| `update_table_property` | Update table properties (column width, etc.) |
| `insert_table_row` | Insert rows into a table block |
| `insert_table_column` | Insert columns into a table block |
| `merge_table_cells` | Merge cells in a table block |
| `unmerge_table_cells` | Unmerge cells in a table block |
| `delete_table_rows` | Delete rows from a table block |
| `delete_table_columns` | Delete columns from a table block |

---

### Create a child block (append content)

Add new blocks as children of an existing block. Use the Page block (root) to append to the end of the document.

**Method/Path:** `POST /docx/v1/documents/{document_id}/blocks/{block_id}/children`

```bash
# Append a text paragraph to the document (block_id = document_id for root)
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX/blocks/doxcnXXXXXXXXXX/children \
  -m POST -d '{
    "children": [
      {
        "block_type": 2,
        "text": {
          "elements": [
            { "text_run": { "content": "New paragraph text" } }
          ]
        }
      }
    ]
  }'

# Append a heading
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX/blocks/doxcnXXXXXXXXXX/children \
  -m POST -d '{
    "children": [
      {
        "block_type": 3,
        "heading1": {
          "elements": [
            { "text_run": { "content": "New Section" } }
          ]
        }
      }
    ],
    "index": -1
  }'
```

**Body:**

| Field | Required | Description |
|-------|----------|-------------|
| `children` | Yes | Array of block objects to insert |
| `index` | No | Insert position among siblings; `-1` or omit to append at end |

---

### Delete a block

Delete a block from the document.

**Method/Path:** `DELETE /docx/v1/documents/{document_id}/blocks/{block_id}`

```bash
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX/blocks/doxcnXXX_blk_yyy \
  -m DELETE
```

---

### Batch update blocks

Perform multiple block operations in a single request.

**Method/Path:** `PATCH /docx/v1/documents/{document_id}/blocks/batch_update`

```bash
nyxid proxy request api-lark /docx/v1/documents/doxcnXXXXXXXXXX/blocks/batch_update \
  -m PATCH -d '{
    "requests": [
      {
        "block_id": "doxcnXXX_blk_aaa",
        "update_text_elements": {
          "elements": [{ "text_run": { "content": "Updated A" } }]
        }
      },
      {
        "block_id": "doxcnXXX_blk_bbb",
        "update_text_elements": {
          "elements": [{ "text_run": { "content": "Updated B" } }]
        }
      }
    ]
  }'
```

---

### Upload media to document

Upload an image or file to a document block. This is a two-step process: create a media block, then upload content.

**Step 1: Create an image/file block** (use "Create a child block" above with `block_type` 18 for image or 23 for file)

**Step 2: Upload media**

**Method/Path:** `POST /docx/v1/medias/upload_all`

```bash
# Upload an image (multipart form)
nyxid proxy request api-lark /docx/v1/medias/upload_all \
  -m POST \
  -F "file=@./image.png" \
  -F "file_name=image.png" \
  -F "parent_type=docx_image" \
  -F "parent_node=doxcnXXXXXXXXXX" \
  -F "size=102400"

# Upload a file attachment
nyxid proxy request api-lark /docx/v1/medias/upload_all \
  -m POST \
  -F "file=@./spec.pdf" \
  -F "file_name=spec.pdf" \
  -F "parent_type=docx_file" \
  -F "parent_node=doxcnXXXXXXXXXX" \
  -F "size=204800"
```

**Form fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `file` | Yes | The file to upload (max 20 MB) |
| `file_name` | Yes | File name |
| `parent_type` | Yes | `docx_image` or `docx_file` |
| `parent_node` | Yes | Document ID |
| `size` | Yes | File size in bytes |

**Response:**

```json
{
  "code": 0,
  "data": {
    "file_token": "boxbc_zzz"
  }
}
```

After uploading, update the image/file block to set the `file_token` using the PATCH block API.

---

### Download media from document

Download an image or file embedded in a document.

**Method/Path:** `GET /docx/v1/medias/{file_token}/download`

```bash
# Download and save to local file
nyxid proxy request api-lark /docx/v1/medias/boxbc_zzz/download \
  -o ./downloaded_image.png
```

---

## Common Pitfalls

**Wiki token requires resolution**

A `/wiki/TOKEN` URL cannot be used directly as a document token. Resolve it first:

```bash
nyxid proxy request api-lark /wiki/v2/spaces/get_node \
  -m POST -d '{"token":"wiki_token"}'
```

This returns `node.obj_type` and `node.obj_token`. Use `obj_token` for all subsequent Doc API calls. Only proceed with `docx` APIs when `obj_type == "docx"`.

| `obj_type` | Use API |
|------------|---------|
| `docx` | `/docx/v1/documents/...` |
| `doc` | `/drive/v1/files/:token/comments` only |
| `sheet` | Sheets API |
| `bitable` | Base API |

**Block-level editing, not Markdown**

The Lark Doc API operates on blocks (structured JSON), not Markdown. To update document content:

1. List blocks to find the target: `GET /docx/v1/documents/{id}/blocks`
2. Update the specific block: `PATCH /docx/v1/documents/{id}/blocks/{block_id}`
3. Or append new blocks: `POST /docx/v1/documents/{id}/blocks/{block_id}/children`

There is no Markdown-in/Markdown-out API. The `raw_content` endpoint returns plain text, not Markdown.

**Media insert is a multi-step operation**

Inserting media requires: create a placeholder block (image or file type) -> upload the file via `/docx/v1/medias/upload_all` -> update the block to set the `file_token`. If interrupted, the document may contain an empty block.

**Overwriting the entire document is destructive**

To "overwrite" a document, you must delete all child blocks of the root page block and then create new children. This destroys images, whiteboard tokens, comments, and embedded tables. Prefer targeted block updates or appends whenever possible.

**Block types reference**

| Type ID | Name | Notes |
|---------|------|-------|
| 1 | Page | Root block; `block_id` = `document_id` |
| 2 | Text | Paragraph |
| 3 | Heading1 | |
| 4 | Heading2 | |
| 5 | Heading3 | |
| 6 | Heading4 | |
| 7 | Heading5 | |
| 8 | Heading6 | |
| 9 | Heading7 | |
| 10 | Heading8 | |
| 11 | Heading9 | |
| 12 | Bullet | Unordered list item |
| 13 | Ordered | Ordered list item |
| 14 | Table | Table container |
| 15 | TableCell | Cell within a table |
| 18 | Image | Requires `file_token` |
| 23 | File | Requires `file_token` |
| 27 | Code | Code block |

**Migration note**

This reference uses `nyxid proxy request api-lark` (NyxID proxy with user identity) for all commands. The older `lark-cli docs +create/+fetch/+update/+media-insert/+media-download` shortcuts are replaced by direct Lark OpenAPI calls through NyxID. The key difference: NyxID proxy sends raw API requests, so you work with block-level JSON structures instead of the Markdown abstraction that `lark-cli` provided.
