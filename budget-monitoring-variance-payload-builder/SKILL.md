---
name: budget-monitoring-variance-payload-builder
version: "1.2"
description: Builds a deterministic Lark budget variance alert from four Aevatar/NyxID-read Bitable record sets. Use for budget-monitoring runs after the caller has fetched core budget, core actual, aelf budget, and aelf actual records. Keeps credentials and connector settings outside the skill.
metadata:
  category: plain
  tag:
    - aevatar
    - s-capability
    - budget-monitoring
    - lark
    - payload-builder
  clawdbot:
    emoji: "bar_chart"
    files:
      - "references/*"
      - "scripts/*"
---

# Budget Monitoring Variance Payload Builder

Use this skill after Aevatar has already read the budget records through NyxID.

This skill does one thing: turn four record sets into a deterministic Lark interactive-card payload. It does not read Lark, store credentials, choose schedules, or send messages.

## When to use

Use for `budget-monitoring` when the caller has:

- core planned budget records
- core actual spend records
- aelf planned budget records
- aelf actual spend records
- optional period, currency, thresholds, and Lark receiver metadata

Do not use this skill to configure NyxID, create Bitable tables, or request Lark permissions.

## Inputs

Required input keys:

- `coreBudgetRecords`
- `coreActualRecords`
- `aelfBudgetRecords`
- `aelfActualRecords`

Optional input keys:

- `period`
- `currency`
- `watchThresholdPercent`
- `alertThresholdPercent`
- `criticalThresholdPercent`
- `receiveId`
- `receiveIdType`

Record field aliases, cutoff rules, variance formulas, and Lark card layout are defined in `references/budget-variance-contract.md`.

## Output

Return one JSON object with:

- `message_type: "interactive"`
- `summary`
- `severity`
- `period`
- `currency`
- `dataCutoff`
- `totals`
- `sections`
- `highlights`
- `lark.card`
- `lark.body` when `receiveId` is provided

The returned `lark.body` is connector-ready for:

```text
POST /open-apis/im/v1/messages?receive_id_type=<receiveIdType>
```

## Determinism requirement

Follow `references/budget-variance-contract.md`. If executing code is allowed, use `scripts/build_budget_variance_payload.js` as the reference implementation. If executing code is not allowed, reproduce the same transformations exactly.

Do not invent records, table ids, app tokens, receiver ids, credentials, or schedules.

## Failure behavior

If any required record set is missing, return:

```json
{
  "needs_more_information": true,
  "missing": ["coreBudgetRecords"]
}
```
