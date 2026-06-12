# Contact — User Lookup & Search

All requests use BOT identity:
```
nyxid proxy request api-lark-bot /open-apis/contact/v3/...
```

---

## Get user info

- **Method:** GET
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/contact/v3/users/{user_id}?user_id_type=open_id"`

Query params:
- `user_id_type`: `open_id` (default), `union_id`, `user_id`

Returns: `name`, `en_name`, `email`, `mobile`, `avatar`, `department_ids`, `status`.

### Get current user (user identity only)

- **Method:** GET
- **Path:** `nyxid proxy request api-lark "/contact/v3/users/me"`

Requires `contact:user.base:readonly` scope (hard to get). Prefer bot identity for contact lookups.

---

## Search users

- **Method:** POST
- **Path:** `nyxid proxy request api-lark-bot "/open-apis/contact/v3/users/search?user_id_type=open_id" -m POST -d '...'`
- **Body:**
```json
{
  "query": "keyword",
  "page_size": 20,
  "page_token": ""
}
```

Searches by name, email, or mobile. Returns matching users with pagination.

---

## Notes
- Bot can look up any user in the org by open_id
- User identity for /users/me requires contact:user.base:readonly scope (hard to get)
- Prefer bot identity for contact lookups

---

## Permissions

| Operation | Scope |
|-----------|-------|
| Get user info | `contact:user.base:readonly` |
| Search users | `contact:user.base:readonly`, `search:user` |
