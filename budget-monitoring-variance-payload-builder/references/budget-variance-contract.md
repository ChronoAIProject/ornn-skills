# Budget variance contract

This contract defines the deterministic behavior for `budget-monitoring-variance-payload-builder`.

## Record sources

The caller provides four arrays:

| Input key | Meaning |
|---|---|
| `coreBudgetRecords` | Planned budget records for core operations |
| `coreActualRecords` | Actual spend records for core operations |
| `aelfBudgetRecords` | Planned budget records for aelf operations |
| `aelfActualRecords` | Actual spend records for aelf operations |

Each item may be either a raw Lark Bitable item with `fields`, or a plain field object. Use `item.fields` when present; otherwise use the item itself.

## Field aliases

Use the first non-empty value in the listed order.

| Normalized field | Source fields |
|---|---|
| `date` | `日期`, `date`, `Date`, `period`, `month` |
| `category` | `一级类目`, `category`, `Category`, `project`, `Project`, `department`, `team` |
| `businessUnit` | `BU`, `bu`, `businessUnit`, `business_unit`, `team`, `department` |
| `amount` | `支出金额(USD)`, `amount`, `Amount`, `budget`, `planned`, `actual`, `spent`, `cost` |

Default missing `category` and `businessUnit` to `Unknown`.

## Amount parsing

Parse amounts as follows:

- Numeric values are used directly.
- Empty values become `0`.
- Remove commas, whitespace, and double quotes before parsing.
- Parenthesized values are negative: `(123.45)` becomes `-123.45`.
- Invalid values become `0`.

## Date normalization

Normalize supported date strings:

| Input shape | Output |
|---|---|
| `YYYY-MM-DD` | unchanged |
| `YYYY/MM/DD` | `YYYY-MM-DD` |
| `D/M/YY`, `DD/MM/YY`, `D/M/YYYY`, `DD/MM/YYYY` | `YYYY-MM-DD` |

Unsupported non-empty date strings are kept as-is.

## Cutoff rules

- `coreCutoff` is the maximum normalized date in core actual records.
- `aelfCutoff` is the maximum normalized date in aelf actual records.
- Core budget records are filtered to `date <= coreCutoff` when `coreCutoff` exists.
- aelf budget records are filtered to `date <= aelfCutoff` when `aelfCutoff` exists.
- Actual records are not filtered.
- `dataCutoff` is the greater of `coreCutoff` and `aelfCutoff`.

## Grouping

Compute these sections:

| Section | Planned records | Actual records | Group key |
|---|---|---|---|
| `core` | filtered core budget | core actual | `category` |
| `aelf` | filtered aelf budget | aelf actual | `category` |
| `coreByBusinessUnit` | filtered core budget | core actual | `businessUnit` |

## Formulas

For each group:

```text
planned = sum(planned.amount)
actual = sum(actual.amount)
variance = actual - planned
usagePercent = planned > 0 ? actual / planned * 100 : actual > 0 ? -1 : 0
variancePercent = planned > 0 ? variance / planned * 100 : actual > 0 ? -1 : 0
```

Round numeric outputs to two decimal places.

`usagePercent = -1` means actual spend exists without a planned budget.

## Levels

Default thresholds:

```json
{
  "watchThresholdPercent": 80,
  "alertThresholdPercent": 100,
  "criticalThresholdPercent": 120
}
```

Classify each group:

| Condition | Level |
|---|---|
| `usagePercent == -1` | `critical` |
| `usagePercent >= criticalThresholdPercent` | `critical` |
| `usagePercent >= alertThresholdPercent` | `warning` |
| `usagePercent >= watchThresholdPercent` | `watch` |
| otherwise | `ok` |

Sort groups by descending `usagePercent`, treating `-1` as highest priority.

## Severity

- `critical` if any group is critical.
- `warning` if any group is warning or watch.
- `info` otherwise.

Lark header templates:

| Severity | Template |
|---|---|
| `critical` | `red` |
| `warning` | `orange` |
| `info` | `green` |

## Output shape

Return a JSON object with:

```json
{
  "message_type": "interactive",
  "summary": "Budget variance summary for <period>",
  "severity": "info|warning|critical",
  "period": "<period>",
  "currency": "USD",
  "dataCutoff": "YYYY-MM-DD",
  "thresholds": {
    "watchPercent": 80,
    "warningPercent": 100,
    "criticalPercent": 120
  },
  "totals": {
    "planned": 0,
    "actual": 0,
    "variance": 0,
    "usagePercent": 0,
    "variancePercent": 0
  },
  "sections": {
    "core": { "totalBudget": 0, "totalActual": 0, "variance": [] },
    "aelf": { "totalBudget": 0, "totalActual": 0, "variance": [] },
    "coreByBusinessUnit": []
  },
  "highlights": [],
  "lark": {
    "msg_type": "interactive",
    "card": {},
    "body": {}
  }
}
```

Include `lark.body` only when `receiveId` is provided. `lark.body.content` must be the JSON string form of `lark.card`.
