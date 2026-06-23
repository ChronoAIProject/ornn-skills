---
name: aevatar-platform-map
description: Panorama, entry point, and catalog for the whole Aevatar skill collection driven over its REST API. Load this FIRST whenever a user wants to build, publish, schedule, or operate things on Aevatar — "create an agent team", "make a workflow / member", "publish/bind a service", "register it with NyxID", "set up a recurring/scheduled run", "deploy an agent", "invoke my service" — or just wants to know what aevatar skills exist. It teaches the object model (scope → team → member(workflow/script/gagent) → service → schedule), how to authenticate with a NyxID token, how to resolve your scope, and indexes every member of the aevatar skill family (control-plane + authoring + diagnostics + safety-net), all held together by the shared `aevatar` tag. It does not perform the work itself — it routes you to the right companion skill.
version: "1.1"
metadata:
  category: plain
  tag:
    - aevatar
    - control-plane
    - overview
    - routing
    - nyxid
    - team
    - workflow
    - service
    - schedule
---

# Aevatar control plane — the map

You drive Aevatar through its REST API at
`https://aevatar-console-backend-api.aevatar.ai`. This skill is the **panorama**: the
object model, how to authenticate, and which companion skill owns each task. Read it
first, then load the spoke skill for the step you are on. Every companion skill is also
self-contained, so you can jump straight to one if you already know the step.

## The object model (one picture)

```
scope  (= your NyxID subject id; your private workspace; everything hangs off it)
  ├── team       a group of members with one "entry member" as its front door
  │     └── member   a callable unit; its implementation is ONE of:
  │            • workflow   (a YAML pipeline of roles + steps)   ← most common
  │            • script     (an app script)
  │            • gagent     (a hosted agent actor)
  ├── service    a member/team published so it can be invoked + (host-gated) registered to NyxID
  └── schedule   fires a service on a cron, authenticated as you (NyxID)
```

The lifecycle the user almost always wants:
**author a workflow → wrap it in a member → group members into a team → publish as a
service (register to NyxID) → schedule it.**

## Authenticate (every request)

- **Base URL:** `https://aevatar-console-backend-api.aevatar.ai`
- **Auth header:** every call needs `Authorization: Bearer <token>`.
  - Local NyxID CLI login: read the token from `~/.nyxid/access_token`.
  - Or use the NyxID-brokered access this agent already holds (an API key with NyxID
    service access works the same way — send it as the bearer).
- **Resolve your scope once** — `scopeId` is your NyxID subject id:
  ```bash
  BASE=https://aevatar-console-backend-api.aevatar.ai
  TOK=$(tr -d '\n' < ~/.nyxid/access_token)
  scopeId=$(curl -s -H "Authorization: Bearer $TOK" "$BASE/api/studio/context" | jq -r .scopeId)
  ```
  (`GET /api/auth/me` and `GET /api/workflow/observatory/me` also return `scopeId`.)
- All studio resources live under `/api/scopes/{scopeId}/...`. Account-level service and
  schedule management live under `/api/services` and `/api/schedules`.

## Which skill for which task (router)

| You want to… | Use the skill | Key endpoints |
|---|---|---|
| Turn an idea into a runnable **workflow YAML** | `aevatar-workflow-authoring` | `aevatar_start_workflow`, `/api/scopes/{id}/workflows` |
| Create a **team**, create **members** (workflow/script/gagent), bind them, set the entry member | `aevatar-team-builder` | `/api/scopes/{id}/teams`, `/members`, `/members/{id}/binding` |
| **Publish** a member/team **as a service** and **register it to NyxID**; verify it | `aevatar-service-publisher` | `/api/scopes/{id}/binding`, `/api/services/*`, `/members/{id}/published-service` |
| Run it on a **cron schedule** (authenticated as you) | `aevatar-scheduler` | `/api/schedules`, `:run-now`, `:enable`, `:disable` |
| **Invoke**, watch **runs**, observe | (this map + service-publisher's invoke section) | `/invoke/{endpointId}`, `/runs/*`, `/api/workflow/observatory/*` |

If a companion skill is not already loaded, find it with an ornn skill search for the
capability (e.g. "aevatar team builder", "aevatar service publisher", "aevatar
scheduler"), then load it. None of them depend on this map at run time — they restate the
minimal bootstrap above.

## The full aevatar skill collection

ornn has no separate "collection" object — the aevatar capability set is held together by
a shared **`aevatar` tag** and indexed by this map. An ornn skill search for **`aevatar`**
returns the whole family as one set; load whichever member you need with `use_skill`. This
map is the canonical entry point; the rest are pulled on demand.

**Build & operate — the control-plane family** (client REST, `category: plain`, public)
- `aevatar-platform-map` — *this map*: object model, auth + scope bootstrap, routing.
- `aevatar-team-builder` — create teams; create + bind members (workflow/script/gagent); set the entry member.
- `aevatar-service-publisher` — publish a member/team/workflow as a service; verify NyxID registration; invoke.
- `aevatar-scheduler` — cron schedules that fire a service (scope-owner NyxID auth).

**Author a workflow** (`category: tool-based`, public)
- `aevatar-workflow-authoring` — turn a request into a validated, persisted workflow YAML
  (server-side `aevatar_start_workflow` / `ornn_publish_skill`). Its output is the workflow
  a `team-builder` member binds or a `service-publisher` scope binding publishes.

**Diagnose — capability probes** (`category: plain`; currently private/owner-only)
- `aevatar-capability-probe`, `aevatar-workflow-engine-probe`, `aevatar-scripting-probe`,
  `aevatar-vision-probe`, `aevatar-attachment-probe`, `aevatar-file-extract-probe` —
  small self-tests that check whether a given platform capability is available in the
  current scope before you depend on it.

**Safety net — cross-cutting** (`category: plain`, public)
- `fallback-to-calling-agent` — when you genuinely cannot finish a request server-side,
  hand the original problem back to the calling agent instead of failing opaquely. Generic
  (no `aevatar` tag), but part of how this family degrades safely.

## The golden path, end to end

1. **Author** the workflow YAML — `aevatar-workflow-authoring`.
2. **Create team** — `POST /api/scopes/{scopeId}/teams {displayName}`.
3. **Create + bind a workflow member** — `POST /api/scopes/{scopeId}/members`, then
   `PUT /api/scopes/{scopeId}/members/{memberId}/binding` (carries the YAML). The bind is
   async; wait for its binding run to reach `succeeded`. — `aevatar-team-builder`.
4. **Set the team entry member** — `PUT /api/scopes/{scopeId}/teams/{teamId}/entry-member {memberId}`.
5. **Publish as a service + register to NyxID**, then verify the NyxID slug —
   `aevatar-service-publisher`.
6. **Schedule** it on a cron, authenticated as the scope owner — `aevatar-scheduler`.

## Honesty rules (so you never over-promise)

- **You are a client.** Everything here is plain REST you call with the user's NyxID
  bearer token. There is no server-side tool that creates teams/members/services for you —
  you make the HTTP calls.
- **NyxID registration is host-gated.** Publishing a service only results in a NyxID
  connector if the platform host has external exposure enabled (and the service is in
  scope of that policy). You drive publish + verify; you cannot force registration on. If
  the service's `externalExposure` block stays empty, say so: the service is still usable
  in-scope, just not exposed as a NyxID-brokered connector. (Details in
  `aevatar-service-publisher`.)
- **Many steps are async.** Bindings, deployments, and runs settle over time. Read state
  back (binding run status, invocation readiness, run timeline) instead of assuming
  success from a 2xx.
- **Never fabricate ids.** Always use the ids returned by the create/bind responses.

## If you get stuck

If after a genuine attempt you cannot complete the request server-side (missing
capability, a hard failure, or something that needs the caller's local environment), hand
the original request back to your caller cleanly rather than failing opaquely — see the
fallback skill in this family.
