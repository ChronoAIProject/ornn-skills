---
name: aevatar-workflow-authoring
description: Author, validate, and persist an executable aevatar workflow from a natural-language request — use it when the user wants to create, build, set up, or automate a multi-step task as a runnable aevatar workflow (make a workflow that…, automate…, build a pipeline…, set up a recurring…). It generates workflow YAML, dispatch-validates it, then saves it as a reusable workflow that can be re-run and watched in the observatory. Not for running an existing workflow — search for that and start it instead.
version: "1.1"
metadata:
  category: tool-based
  tool-list:
    - nyxid_services
    - aevatar_start_workflow
    - ornn_publish_skill
  tag:
    - workflow
    - authoring
    - automation
    - aevatar
    - create-workflow
    - pipeline
---

# Authoring an executable aevatar workflow

You turn a user's natural-language request into a **valid, test-run, reusable** aevatar workflow. A workflow is a YAML document of `roles` + `steps` that the engine executes; once validated you persist it as a skill so the user can re-run it and watch it in the observatory.

Everything you need is in this document — the DSL, the engine rules, the tools, and worked examples. Follow the protocol in order.

> **Two execution surfaces — know which one you are *before* step 3.** Steps 3 / 5 / 6 below call the *server-side agent tools* `nyxid_services`, `aevatar_start_workflow`, and `ornn_publish_skill`. Those exist **only** when you are the model running **inside** an aevatar session with the nyxid MCP connected. If instead you are an external **client** holding only a NyxID bearer token (e.g. `~/.nyxid/access_token`) — the same identity the sibling skills (`aevatar-team-builder`, `aevatar-service-publisher`, `aevatar-scheduler`) assume — **those three tools are not callable**, and you dry-run + publish over plain authenticated REST instead. Jump to **[Client path (no nyxid MCP)](#client-path-no-nyxid-mcp--dry-run--publish-over-rest)** at the end; the DSL, engine rules, and examples in between apply to both surfaces.

---

## Protocol (follow in order)

1. **Confirm the intent is authoring.** The user wants a *new* runnable workflow. If they want to run something that already exists, stop and search for it instead.
2. **Clarify just enough.** Pin down: the trigger/input, the ordered steps, the desired output, and which external services (if any) are involved. Ask only what you cannot reasonably infer; do not over-interrogate.
3. **Inventory connectors (only if external calls are needed).** Call `nyxid_services` with `{"action":"list"}` to see what the user actually has connected. If a step needs a connector the user does not have, say so plainly and stop or degrade — never author a step against a connector that does not exist.
4. **Author the YAML.** Apply the DSL below and obey every rule in **Engine rules (must obey)**. Prefer the reliable-core primitives; use advanced primitives only when the task truly needs them.
5. **Validate by dispatching one test run — fire-and-observe, do NOT wait for completion.** Call `aevatar_start_workflow` **once** with the draft inline (`workflow_yamls`). It returns in a second or two with a `run_id` and a status like `accepted`/`streaming` — **that return is your structural pass** (the YAML parsed and dispatched). If instead it returns a parse/validation/4xx error, fix the YAML and retry (cap **2**). **Never poll or wait for `run_finished`, and never re-invoke `aevatar_start_workflow` to "check status"** — the run continues asynchronously and is watchable in the observatory; looping on it stalls the turn.
6. **Persist as a reusable workflow.** Once the draft dispatches without a parse error, call `ornn_publish_skill` with the final workflow in `workflow_yamls` (see **Persisting**). This creates a private skill in the user's account containing the workflow.
7. **Report.** Tell the user what was created, the test `run_id` and that they can watch it in the observatory, and how to re-run it ("next time just ask to run *\<name\>*"). Be explicit: you verified it **structurally** (it parsed and dispatched) and reviewed the logic on a best-effort basis — you did **not** wait for the run to finish, so point them to the observatory for the result. Do not claim a guarantee you cannot make.
8. **Iterate on request.** To change an existing workflow: load it with `use_skill`, edit the YAML, re-validate (step 5), and re-publish as a new version.

> **Turn budget (important).** Your whole turn has a ~60s gateway limit, and tool rounds emit no visible text. So: lead with a one-line text preamble (e.g. "Authoring your workflow…") so output starts streaming immediately; keep tool rounds minimal (skip step 3 when the workflow needs no external service); author in one pass; and **never loop waiting on a run** (step 5 is fire-and-observe). A turn that spends ~60s in silent tool rounds is cut off with no output at all.

---

## Engine rules (must obey)

These are the failure modes that break generated workflows. Check every one before validating.

- **Single terminal step.** A run ends at the step that has no `next` **and is last in document order**. Make the final step the last line of the document.
- **Fall-through is by document order, not id order.** A step with no `next` falls through to the *next step written in the file*. So every branch must reach the terminal step via an explicit `next`, and nothing should sit after the terminal step. Getting this wrong silently overwrites your output.
- **No clock.** The engine has no time source. If the workflow needs "today", a date, or a window, the caller must inject it via the run input (e.g. an early `assign`). Never assume the engine knows the date.
- **Role is not model.** `target_role` selects the actor, not a model — never put a model name in `target_role`. A role *may* carry `provider`/`model`, but set them only when the user explicitly wants a specific model; otherwise omit and let the session default apply.
- **`parameters` values are strings.** Bare words are read as strings (`op: trim`); quote anything numeric or boolean so it stays a string (`n: "50"`, `max_iterations: "5"`).
- **Determinism for money/counts/dedup.** Use `transform` (`sum`, `group_by`, `round`, …) for any arithmetic, totals, or deduplication. Never let an `llm_call` compute amounts or counts.
- **Side effects are at-least-once.** `tool_call` / `connector_call` may run more than once on retry. Keep them idempotent where it matters.
- **External calls go through tools, not raw hosts.** Use `nyxid_proxy` (or a typed tool) — never embed a vendor base URL as a direct target. See **Accessing external services**.

---

## DSL quick reference

### Top-level shape

```yaml
name: my_workflow            # identifier
description: what it does     # optional
roles: [ ... ]               # actors
steps: [ ... ]               # ordered execution
```

### Roles

```yaml
roles:
  - id: analyst                       # referenced by step.target_role
    name: Analyst                     # optional display name
    system_prompt: "You are a strict analyst."
    # optional, usually omit and inherit session defaults:
    # provider: openai
    # temperature: "0.2"
    # allowed_tools: [web_search]     # ceiling of agent tools this role can see; [] = none
    # connectors: [my_api]            # whitelist for connector_call
```

`agent_kind` defaults to `workflow.role-agent`. Omit `model` (see Engine rules). `allowed_tools: []` means the role exposes no agent tools.

### Step shape

```yaml
steps:
  - id: step_a                 # unique within the workflow
    type: llm_call             # primitive type (see table)
    target_role: analyst       # which role runs it (alias: role); some types need none
    parameters:                # all values are strings
      prompt_prefix: "Analyze:"
    next: step_b               # explicit successor; omit only on the final step
    branches:                  # for conditional/switch/vote: branch key -> step id
      true: step_b
      false: step_c
    # compensation: undo_step  # only tool_call/connector_call/secure_connector_call
    # allowed_tools: [web_search]  # only llm_call: narrow tool scope (intersection with role)
```

### Reliable-core primitives (prefer these)

`llm_call` — run the target role's LLM.
```yaml
- id: analyze
  type: llm_call
  target_role: analyst
  parameters: { prompt_prefix: "Summarize the input:" }
```

`tool_call` — call a registered tool (incl. `nyxid_proxy`). A JSON-object result is mirrored to `steps.<id>.json.<field>` for later branching.
```yaml
- id: fetch
  type: tool_call
  parameters:
    tool: nyxid_proxy
    arguments: '{"slug":"my-http-service","path":"/v1/items","method":"GET"}'
```

`transform` — deterministic data ops: `trim`, `split`, `json_extract`, and numeric `sum`/`subtract`/`multiply`/`divide`/`round`/`min`/`max`/`group_by`, plus `rss_extract_items`.
```yaml
- id: total
  type: transform
  parameters: { op: group_by, key: category, value: amount, aggregate: sum, precision: "2" }
```

`assign` — write a workflow variable (often the final output step).
```yaml
- id: finalize
  type: assign
  parameters: { target: final_summary, value: "$input" }
```

`conditional` — two-way branch; set `branches.true`/`branches.false`.
`switch` — multi-way branch on a value; set `parameters.branch.<key>` and `branches`, include `_default`.
```yaml
- id: route
  type: switch
  parameters:
    on: "${steps.classify.json.category}"
    branch.urgent: handle_urgent
    branch._default: handle_normal
  branches: { urgent: handle_urgent, _default: handle_normal }
```

`foreach` — split input by delimiter, run a sub-step per item, merge.
```yaml
- id: per_item
  type: foreach
  parameters:
    delimiter: "\n"
    sub_step_type: llm_call
    sub_target_role: worker
    sub_param_prompt_prefix: "Process item:"
```

### Full primitive vocabulary (use advanced ones only when needed)

| Group | Types |
|---|---|
| AI | `llm_call`, `tool_call`, `evaluate` (score+threshold), `reflect` |
| Data | `transform`, `assign`, `retrieve_facts`, `cache` |
| Control | `guard`/`assert`, `conditional`, `switch`, `while`/`loop`, `delay`/`sleep`, `lease`/`mutex`, `wait_signal`, `checkpoint` |
| Composition | `foreach`, `parallel`/`fan_out`, `race`, `map_reduce`, `workflow_call`, `dynamic_workflow`, `vote` |
| Integration | `connector_call` (aliases: `http_get`, `http_post`, `http_put`, `http_delete`, `mcp_call`, `cli_call`), `emit`/`publish` |
| Human | `human_input`, `human_approval`, `wait_signal` |

Advanced notes: `human_approval`/`wait_signal` suspend the run until a resume/signal event — use them for approvals and long external waits instead of stretching a step past its 600s executor limit. `parallel`/`foreach`/`map_reduce` accept `min_concurrent_workers`/`max_concurrent_workers`. Side-effecting steps may declare `compensation: <step_id>` for saga rollback.

### Interpolation

- `$input` — the current step's input (the previous step's output, or — for the FIRST step — the run prompt). This is how a value flows step-to-step.
- `${steps.<id>.output}` — a prior step's text output. **It is `.output`, NOT `.text`.** The engine registers `steps.<id>.output` and never `steps.<id>.text`, so `${steps.<id>.text}` silently resolves to an empty string — the run still shows every step "completed", but a tool/connector downstream receives an empty argument and fails.
- `${<name>}` — a workflow variable written by an `assign` step (`target: <name>`). This is the canonical way to read a captured value back in a later step; `${steps.<capture-id>.text}` does NOT work (use the bare `${<name>}`, or equivalently `${steps.<capture-id>.output}`).
- `${steps.<id>.json.<field>}` — a field from a prior step whose output was a JSON object (e.g. a `tool_call` result). Also: `${steps.<id>.success}`, `${steps.<id>.error}`, `${steps.<id>.annotations.<ns>.<key>}`.
- Expression functions (usable in any value, incl. `condition`): `if`, `concat`, `isblank`, `length`, `not`, `and`, `or`, `upper`, `lower`, `trim`, `json`, `add`, `sub`, `mul`, `div`, `eq`, `lt`, `lte`, `gt`. **There is no `contains`/substring function.**

> **Gotchas that silently break runs (verified against the engine — a clean test run does NOT catch these, because failed tool calls return their error as ordinary step output):**
> - **`${steps.<id>.text}` is always empty — use `${steps.<id>.output}`.** This is the #1 cause of "every step completed but the connector got an empty argument."
> - **Read an `assign`ed value with the bare `${<target>}`**, not `${steps.<capture-id>.text}`.
> - **`transform op: split` joins all parts with `\n---\n` and ignores any `index`** — it is for fan-out, not single-element extraction. To use one segment of `a/b` (e.g. an `owner/repo` in a path), pass the whole string where the `/` is already correct rather than splitting it apart.
> - **`conditional.condition`** is interpolated first; if the result is not literally `true`/`false`, the engine does a substring `$input.Contains(condition)`. Since there is no `contains` function, build "any/all contain token" checks around this: `concat` the inputs into one string in the prior step, then set `condition` to the literal token.

---

## Accessing external services

There are two distinct mechanisms. Pick the one that matches what the user actually has connected — they are separate subsystems.

- **nyxid-brokered services (the common case in this scenario).** A user connecting through nyxid has services exposed as nyxid connectors. Call them with a `tool_call` on the `nyxid_proxy` tool, passing a JSON string in `arguments`:
  ```yaml
  - id: call_api
    type: tool_call
    parameters:
      tool: "nyxid_proxy"
      arguments: '{"slug":"<service-slug>","path":"/v1/resource","method":"POST","body":{"k":"v"}}'
  ```
  Read fields back with `${steps.call_api.json.<field>}`. Discover available slugs first with `nyxid_services` `{"action":"list"}`; if the needed slug is absent, tell the user and stop or degrade. Note: `connector_call` does **not** reach nyxid services — it only resolves connectors registered in the workflow connector registry, a different subsystem.
- **Registered workflow connectors.** If the capability is a connector registered in the workflow connector registry, call it with `connector_call` and authorize it on the role:
  ```yaml
  roles:
    - id: caller
      name: Caller
      connectors: [my_connector]
  steps:
    - id: call
      type: connector_call
      target_role: caller
      parameters: { connector: "my_connector", operation: "list", path: "/v1/items", timeout_ms: "10000" }
  ```
- **`allowed_tools` gotcha.** A role with no `allowed_tools` sees the full inherited tool catalog (including `nyxid_proxy`). But the moment you set `allowed_tools` on a role, you **must** list every tool its steps call (e.g. `allowed_tools: [nyxid_proxy]`) — otherwise the `tool_call` will not resolve the tool at run time.
- **Prefer a typed tool when one exists** for the capability (they expose stable control fields and validation) over a hand-built proxy path.
- **Missing service** → degrade gracefully (skip that source) or stop and ask the user to connect it. Never fabricate a slug or connector.

---

## Validating (fire-and-observe — do not wait)

Dispatch **one** test run with `aevatar_start_workflow`, passing the draft inline:

```json
{ "workflow_id": "<name>", "workflow_yamls": ["<full yaml>"], "inputs": { "prompt": "<test input>" } }
```

`workflow_id` is required; `inputs` is an object (typically `{ "prompt": "..." }`, optionally `input_parts` / `headers`). `aevatar_start_workflow` is **fire-and-return**: it replies in a second or two with a `run_id` and a status like `accepted`/`streaming`, then the run executes **asynchronously**.

Judge the *immediate return only*:
- A `run_id` + `accepted`/`streaming` → the YAML **parsed and dispatched**. That is your structural pass — move on to publish.
- A parse/validation/4xx error in the return → structural failure (bad YAML, unbound role, bad reference). Fix and retry (cap **2**).

**Do not wait for or poll `run_finished`, and do not re-invoke `aevatar_start_workflow` to "check status."** The run finishes asynchronously; the user watches it in the observatory via the `run_id`. (Waiting or looping is exactly what blows the ~60s turn budget and gets the whole turn cut off.) This confirms the workflow is **structurally** sound (it parsed and dispatched) — not that its business logic is correct. Say so when you report.

---

## Persisting (make it reusable)

Once the draft dispatches without a parse error, publish a private skill that carries the workflow:

```json
{
  "name": "<kebab-case-workflow-name>",
  "description": "<one line: what it does>",
  "version": "1.0",
  "category": "runtime-based",
  "instructions_markdown": "Runs the <name> workflow. Invoke with use_skill then aevatar_start_workflow; inputs: <list>.",
  "workflow_yamls": [ { "workflow_id": "<name>", "content": "<full yaml>" } ]
}
```

Choose a clear `name`/`description` so the user (and future searches) can find it. Publishing is private by default; the user can later promote it to public on the platform.

**Re-run later:** the user (or their model) loads it with `use_skill("<name>")` — which mounts the workflow into their scope — then calls `aevatar_start_workflow` with `workflow_id: "<name>"`. The run goes through the normal engine path and is visible in the observatory.

---

## Client path (no nyxid MCP) — dry-run + publish over REST

Use this whole section when you hold a **NyxID bearer token** but the server-side tools
(`aevatar_start_workflow` / `ornn_publish_skill` / `use_skill` / `nyxid_services`) are **not** in
your tool list. Everything here is plain authenticated REST against the same control-plane base
the sibling aevatar skills use. (All of it is verified live; none of it requires reading aevatar
source.)

### Bootstrap
```bash
BASE=https://aevatar-console-backend-api.aevatar.ai
TOK=$(tr -d '\n' < ~/.nyxid/access_token)          # or the agent's own NyxID bearer
NYX=$(tr -d '\n' < ~/.nyxid/base_url)               # e.g. https://nyx.chrono-ai.fun
scopeId=$(curl -s -H "Authorization: Bearer $TOK" "$BASE/api/studio/context" | jq -r .scopeId)
```
No `jq`? Any JSON reader works, e.g.
`... | python3 -c 'import sys,json;print(json.load(sys.stdin)["scopeId"])'`.
(WAF can 403 Python's `urllib` — drive these calls with the `curl` binary, not a Python HTTP client.)

### Connectors
The `nyxid_services` inventory tool is server-side. As a client you must know any external
connector **slugs** out-of-band (nyxid CLI / console); the dry-run path below assumes a
workflow with **no** external connectors (pure `llm_call`/`transform`), which is the most
reliable thing to validate. Never invent a slug.

### Dry-run (the client replacement for `aevatar_start_workflow`) — `draft-run`
`aevatar_start_workflow` is a **server-side agent tool dispatched through the engine, not a REST
endpoint** — a client cannot call it. The client dry-run is the **draft-run** endpoint, which
takes the YAML inline:
```bash
curl -sN --max-time 120 -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  "$BASE/api/scopes/$scopeId/workflow/draft-run" \
  -d "$(python3 -c 'import json;print(json.dumps({"prompt":"<test input>","workflowYamls":[open("workflow.yaml").read()]}))')"
```
Body (JSON, **camelCase**): `prompt` (string) + `workflowYamls` (array of YAML strings,
**required** — omitting it returns 400). The response is an **SSE stream** and the run executes
synchronously through the connection. Judge it like the server-side validate step:
- **HTTP 200 + the stream opens with lifecycle/observation frames, no parse/4xx error → structural pass.** You can stop reading there; you do not need to wait for the end.
- A parse/validation/4xx error → fix the YAML and retry (cap **2**).

**Reading the SSE frames** (so a naive parser doesn't see "nothing"): each `data:` line is JSON,
and two kinds interleave — there is **no flat `type` field**:
- *Lifecycle*, keyed by a top-level field: `{"stepStarted":{"stepName":…}}`,
  `{"stepFinished":{"stepName":…}}`, `{"usage":{…}}`, `{"runFinished":{…}}`,
  `{"stateSnapshot":{…}}`. A matched `stepStarted`+`stepFinished` per step proves each step ran;
  `runFinished` marks the end.
- *Raw observation*: `{"custom":{"name":"aevatar.raw.observed",…}}` — these carry the actual step
  **output text** (search recursively under `output` / `content`).

`draft-run` is **not** observable in `/workflow/observatory` (it is a throwaway validation run).
For an observable run, publish + invoke (below / sibling skills).

### Publish the workflow skill to ornn (the client replacement for `ornn_publish_skill`) — REST zip
`ornn_publish_skill` is also server-side. The client publishes a **zip** through the nyxid proxy
(slug **`ornn-api`**, not `ornn`). Build this exact layout — a **root folder**, `SKILL.md` at the
root, and the workflow YAML under **`assets/`** (the validator **rejects a `workflows/` root dir**):
```
demo-skill/
  SKILL.md
  assets/
    my_workflow.yaml      # top-level `name:` + `steps:` → auto-extracted; its `name` is the workflow id
```
The platform's extractor scans `assets/*.{yaml,yml}` and treats any YAML having **both** a
top-level `name` and `steps` as a runnable workflow whose `workflow_id` equals that `name`.

`SKILL.md` frontmatter **must nest under `metadata:`** (flat top-level `category`/`output_type`/
`tool_list` is rejected). A workflow skill is **`category: mixed`** with these **kebab-case** keys —
all three are required for `mixed` (and for `runtime-based`):
```yaml
---
name: demo-skill
description: <one line — what it does>
version: "1.0"
metadata:
  category: mixed
  output-type: text                 # required for mixed / runtime-based
  runtime:                          # required; MUST be a YAML array — a bare string is rejected
    - aevatar-workflow              # the workflow runtime (NOT node/python)
  tool-list:                        # required for mixed
    - aevatar_start_workflow
  tag: [demo, workflow, aevatar]    # singular `tag`, ≤10
---
```
Then **validate first** (the format oracle — read every `violations[].rule`/`message` and fix),
then **upload** (re-uploading the **same `name`** later creates a **new version**):
```bash
cd <parent>; zip -r demo-skill.zip demo-skill                 # root folder MUST be included
# 1) validate → {"data":{"valid":bool,"violations":[{"rule","message"}]}}
curl -s -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/zip" \
  --data-binary @demo-skill.zip "$NYX/api/v1/proxy/s/ornn-api/api/v1/skill-format/validate"
# 2) publish (private by default; promote to public separately)
curl -s -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/zip" \
  --data-binary @demo-skill.zip "$NYX/api/v1/proxy/s/ornn-api/api/v1/skills"
# verify
curl -s -H "Authorization: Bearer $TOK" "$NYX/api/v1/proxy/s/ornn-api/api/v1/skills/demo-skill"
```
The server normalizes the kebab frontmatter into its stored model
(`runtimes:[{runtime,dependencies,envs}]`, `tools:[{tool,type:mcp}]`, `outputType`).

### Run a published workflow skill as a client
The `use_skill` → `aevatar_start_workflow` mount path is server-side. As a client you take the
control-plane route instead: bind the workflow to a **team member**, then invoke the published
service. Binding a member **is** publishing a service; its `chat:stream` invoke runs the workflow
and shows in the observatory. See `aevatar-team-builder` then `aevatar-service-publisher`.

---

## Worked examples (generic — adapt, don't copy verbatim)

### A. Linear LLM chain

```yaml
name: summarize_then_title
roles:
  - id: writer
    system_prompt: "You are a concise writer."
steps:
  - id: summarize
    type: llm_call
    target_role: writer
    parameters: { prompt_prefix: "Summarize the input in 3 bullets:" }
    next: make_title
  - id: make_title
    type: llm_call
    target_role: writer
    parameters: { prompt_prefix: "Write a one-line title for this summary:" }
```
`make_title` is last and has no `next` → it is the single terminal step.

### B. Fetch → classify → branch → converge (single terminal)

```yaml
name: fetch_and_route
roles:
  - id: analyst
    system_prompt: "You classify and draft responses."
steps:
  - id: fetch
    type: tool_call
    parameters:
      tool: nyxid_proxy
      arguments: '{"slug":"<service-slug>","path":"/v1/items","method":"GET"}'
    next: classify
  - id: classify
    type: llm_call
    target_role: analyst
    parameters: { prompt_prefix: "Reply with one word, 'urgent' or 'normal':" }
    next: route
  - id: route
    type: switch
    parameters:
      on: "$input"
      branch.urgent: handle_urgent
      branch.normal: handle_normal
      branch._default: handle_normal   # fallback for unexpected output
    branches: { urgent: handle_urgent, normal: handle_normal, _default: handle_normal }
  - id: handle_urgent
    type: llm_call
    target_role: analyst
    parameters: { prompt_prefix: "Draft an urgent response:" }
    next: finalize
  - id: handle_normal
    type: llm_call
    target_role: analyst
    parameters: { prompt_prefix: "Draft a standard response:" }
    next: finalize
  - id: finalize
    type: assign
    parameters: { target: final_summary, value: "$input" }
```
Both branches converge to `finalize` via explicit `next`; `finalize` is last → single terminal. (No step sits after it, so nothing fall-through-overwrites the output.)

### C. Per-item processing (foreach)

```yaml
name: process_each_line
roles:
  - id: worker
    system_prompt: "You process one item."
steps:
  - id: per_item
    type: foreach
    parameters:
      delimiter: "\n"
      sub_step_type: llm_call
      sub_target_role: worker
      sub_param_prompt_prefix: "Process this item:"
    next: collect
  - id: collect
    type: assign
    parameters: { target: final_summary, value: "$input" }
```

---

## Self-check before publishing

- [ ] Final step is last in the document and has no `next`; every branch reaches it via explicit `next`.
- [ ] Any date/time the logic needs is injected via input, not assumed.
- [ ] No hardcoded `model:` unless the user demanded one.
- [ ] Arithmetic / totals / dedup use `transform`, not `llm_call`.
- [ ] Every external call uses an existing connector (verified via `nyxid_services`) through `nyxid_proxy` or a typed tool.
- [ ] One `aevatar_start_workflow` dispatch returned a `run_id` with no parse error — you did **not** wait for/poll `run_finished` (the run finishes async; report the `run_id` + observatory).
