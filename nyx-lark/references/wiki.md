# Wiki — Knowledge Base

All requests use BOT identity:
```
nyxid proxy request api-lark-bot /open-apis/wiki/v2/...
```

---

## List spaces

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/wiki/v2/spaces?page_size=20&page_token=..."`

Returns: list of wiki spaces with `space_id`, `name`, `description`.

## Get space info

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/wiki/v2/spaces/{space_id}"`

Returns: `name`, `description`, `visibility`.

---

## Get node

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/wiki/v2/spaces/{space_id}/nodes/{node_token}"`

**CRITICAL:** wiki token != doc token. Use this endpoint to extract `obj_token` and `obj_type`, then use `obj_token` for doc/sheet/bitable operations.

Returns: `node_token`, `obj_token`, `obj_type`, `title`, `parent_node_token`, `has_child`.

## List child nodes

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/wiki/v2/spaces/{space_id}/nodes?parent_node_token={parent_node_token}&page_size=50&page_token=..."`

Returns paginated list of child nodes under the given parent.

---

## Create node

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/wiki/v2/spaces/{space_id}/nodes" -m POST -d '...'`
- **Body:**
```json
{
  "obj_type": "docx",
  "parent_node_token": "wikcnXXX",
  "title": "New Document"
}
```

`obj_type`: `docx`, `sheet`, `bitable`, `mindnote`, `file`, `shortcut`.

For shortcuts (links to existing docs):
```json
{
  "obj_type": "shortcut",
  "parent_node_token": "wikcnXXX",
  "obj_token": "doccnXXX"
}
```

---

## Move node

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/wiki/v2/spaces/{space_id}/nodes/{node_token}/move" -m POST -d '...'`
- **Body:**
```json
{
  "target_parent_token": "wikcnYYY",
  "target_space_id": "7xxx"
}
```

---

## Common Pitfalls
- Wiki links require resolution: get node -> extract obj_token -> use obj_token for doc/sheet/bitable operations
- Never use a wiki token directly as `app_token` or `spreadsheet_token`

---

## Permissions

| Operation | Scope |
|-----------|-------|
| List spaces | `wiki:wiki:readonly` |
| Get space info | `wiki:wiki:readonly` |
| Read nodes | `wiki:wiki:readonly` |
| Create/move nodes | `wiki:wiki` |
