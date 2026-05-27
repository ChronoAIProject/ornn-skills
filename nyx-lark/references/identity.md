# Identity Routing & Scope Mapping

## 1. Full Routing Table

Every Lark API domain with: service slug, identity type, reason, verified status.

| Domain | API Path Prefix | Service | Identity | Reason |
|--------|----------------|---------|----------|--------|
| IM (bot messages) | /im/v1/ | api-lark-bot | tenant_access_token | Org-level |
| IM (send as user) | /im/v1/ | api-lark | user_access_token | Personal identity |
| Calendar | /calendar/v4/ | api-lark | user_access_token | Personal calendar |
| Contact | /contact/v3/ | api-lark-bot | tenant_access_token | User scope hard to get |
| Drive | /drive/v1/ | api-lark-bot | tenant_access_token | Drive scope on bot only |
| Doc (docx) | /docx/v1/ | api-lark | user_access_token | docx scope on user |
| Wiki | /wiki/v2/ | api-lark-bot | tenant_access_token | Wiki scope on bot only |
| Task | /task/v2/ | api-lark-bot | tenant_access_token | Task scope on bot only |
| Sheets | /sheets/v3/ | api-lark-bot | tenant_access_token | Sheets scope on bot |
| Base (Bitable) | /bitable/v1/ | api-lark-bot | tenant_access_token | Bitable scope on bot |
| Mail | /mail/v1/ | api-lark | user_access_token | Personal mailbox |
| Approval | /approval/v4/ | api-lark-bot | tenant_access_token | Org-level |
| VC | /vc/v1/ | api-lark-bot | tenant_access_token | Org-level |
| Minutes | /minutes/v1/ | api-lark-bot | tenant_access_token | Org-level |

## 2. Bot Scope Inventory

All scopes needed for `api-lark-bot`. These are configured in the Lark developer console at `https://open.larksuite.com/app/APP_ID/permission`. Bot scopes take effect immediately after adding.

| Domain | Bot Scopes |
|--------|-----------|
| IM | im:message, im:chat, im:chat:readonly |
| Contact | contact:contact.base:readonly |
| Calendar | calendar:calendar, calendar:calendar:readonly |
| Drive | drive:drive, drive:drive:readonly |
| Wiki | wiki:wiki, wiki:wiki:readonly |
| Task | task:task, task:task:readonly |
| Sheets | sheets:spreadsheet |
| Base (Bitable) | bitable:bitable |
| Approval | approval:approval |
| VC | vc:meeting |
| Mail | mail:mailbox |
| Minutes | minutes:minutes:readonly |

## 3. User OAuth Scope Inventory

The exact `--scope` string for `nyxid service add api-lark --oauth`. User scope names are DIFFERENT from bot scope names.

| User OAuth Scope | What It Grants | Corresponding Bot Scope |
|-----------------|----------------|------------------------|
| contact:user.base:readonly | Read user profiles | contact:contact.base:readonly |
| calendar:calendar.event:read | Read events | calendar:calendar:readonly |
| calendar:calendar.event:create | Create events | calendar:calendar |
| calendar:calendar.event:update | Update events | calendar:calendar |
| calendar:calendar.free_busy:read | Free/busy query | calendar:calendar:readonly |
| calendar:calendar:read | Read calendars | calendar:calendar:readonly |
| docx:document | Full doc access | (bot uses drive:drive) |
| docx:document:readonly | Read docs | (bot uses drive:drive:readonly) |
| docx:document:create | Create docs | (bot uses drive:drive) |
| im:chat:read | Read chats | im:chat:readonly |
| im:message | Full message access | im:message |
| im:message.send_as_user | Send as user | (bot-only: im:message) |
| im:message:readonly | Read messages | im:message:readonly |
| im:message.group_msg:get_as_user | Read group msgs | im:message:readonly |
| sheets:spreadsheet:readonly | Read sheets | sheets:spreadsheet |
| approval:task:read | Read approvals | approval:approval |
| approval:instance:read | Read instances | approval:approval |
| drive:drive:readonly | Read drive | drive:drive:readonly |
| wiki:wiki:readonly | Read wiki | wiki:wiki:readonly |
| task:task:read | Read tasks | task:task:readonly |
| task:task:write | Write tasks | task:task |
| mail:mailbox:readonly | Read mail | mail:mailbox |
| bitable:bitable:readonly | Read bitable | bitable:bitable |

## 4. Decision Flowchart

```
Need to call a Lark API?
├── Is it a personal resource? (my calendar, my mail, send as me, my docs)
│   └── Yes → use api-lark (user OAuth)
│       └── Does api-lark have the required scope?
│           ├── Yes → proceed
│           └── No → Can the API also accept tenant_access_token?
│               ├── Yes → fallback to api-lark-bot
│               └── No → re-OAuth with broader scopes
└── No (org-level resource) → use api-lark-bot (tenant token)
    └── Does api-lark-bot have the scope?
        ├── Yes → proceed
        └── No → open Lark console URL to add scope (takes effect immediately)
```

## 5. Path Prefix Reference

| Service | Base URL | Path Example | Full URL |
|---------|----------|-------------|----------|
| api-lark-bot | https://open.larksuite.com | /open-apis/im/v1/chats | https://open.larksuite.com/open-apis/im/v1/chats |
| api-lark | https://open.larksuite.com/open-apis | /im/v1/chats | https://open.larksuite.com/open-apis/im/v1/chats |

Both resolve to the same final URL. The difference is where the `/open-apis/` segment lives.
