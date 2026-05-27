---
name: budget-monitoring-variance-payload-builder
description: Build the Lark alert payload for Aevatar-native budget monitoring by comparing planned and actual spend records and producing a concise variance summary.
metadata:
  category: plain
  tag:
    - aevatar
    - s-capability
    - budget-monitoring
    - lark
    - payload-builder
version: "1.0"
---

# Budget Monitoring Variance Payload Builder

Use this skill when an Aevatar-native budget monitoring capability needs to turn budget and actual spend records into a Lark channel alert payload.

## Input contract

The caller should provide JSON with these fields when available:

- `capability`: `budget-monitoring`.
- `period`: reporting period label.
- `currency`: display currency.
- `coreBudgetRecords`: planned budget records for core operations.
- `coreActualRecords`: actual spend records for core operations.
- `aelfBudgetRecords`: planned budget records for aelf operations.
- `aelfActualRecords`: actual spend records for aelf operations.
- `alertThresholdPercent`: optional variance threshold. Default to `10` if absent.
- `recipientHint`: optional Lark channel or audience hint.

Records may use different source field names. Normalize obvious aliases such as `department`, `team`, `category`, `project`, `budget`, `planned`, `actual`, `amount`, `spent`, `month`, and `period`.

## Task

1. Normalize the records into comparable groups by business unit and category.
2. Compute planned amount, actual amount, absolute variance, and percentage variance for each group.
3. Highlight groups whose absolute percentage variance is greater than or equal to the threshold.
4. Produce a concise Lark-ready payload that can be sent through a NyxID Lark channel bot connector.

## Output contract

Return JSON with this shape:

```json
{
  "message_type": "interactive",
  "summary": "Budget variance summary for <period>",
  "severity": "info|warning|critical",
  "period": "<period>",
  "currency": "<currency>",
  "thresholdPercent": 10,
  "totals": {
    "planned": 0,
    "actual": 0,
    "variance": 0,
    "variancePercent": 0
  },
  "highlights": [
    {
      "group": "<business unit/category>",
      "planned": 0,
      "actual": 0,
      "variance": 0,
      "variancePercent": 0,
      "reason": "<short explanation>"
    }
  ],
  "lark": {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": "Budget variance summary" },
        "template": "blue|orange|red"
      },
      "elements": []
    }
  }
}
```

Use `severity=critical` when any variance is at least twice the threshold, `warning` when any variance crosses the threshold, otherwise `info`. Keep the human text short enough for a Lark channel message.
