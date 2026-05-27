---
name: budget-monitoring-variance-payload-builder
description: Build a deterministic Lark budget variance alert payload from normalized budget and actual spend records for Aevatar-native budget monitoring.
metadata:
  category: plain
  tag:
    - aevatar
    - s-capability
    - budget-monitoring
    - lark
    - payload-builder
version: "1.1"
---

# Budget Monitoring Variance Payload Builder

Use this skill when an Aevatar-native budget monitoring capability needs to turn four Lark Bitable record sets into a deterministic Lark interactive message payload.

The skill is an execution contract, not a place for credentials or connector settings. The caller must read Lark Bitable records through NyxID before invoking this skill, then send the returned Lark payload through the NyxID Lark connector.

## Input contract

The caller should provide JSON with these fields:

- `capability`: must be `budget-monitoring` when present.
- `period`: reporting period label. If absent, derive a concise label from `dataCutoff`; otherwise use `current-period`.
- `currency`: display currency. Default to `USD`.
- `coreBudgetRecords`: planned budget records for core operations.
- `coreActualRecords`: actual spend records for core operations.
- `aelfBudgetRecords`: planned budget records for aelf operations.
- `aelfActualRecords`: actual spend records for aelf operations.
- `alertThresholdPercent`: optional threshold for warning highlights. Default to `100` for n8n-compatible budget usage percentage classification.
- `watchThresholdPercent`: optional threshold for watch highlights. Default to `80`.
- `criticalThresholdPercent`: optional threshold for critical highlights. Default to `120`.
- `recipientHint`: optional Lark channel or audience hint.
- `receiveId`: optional Lark receiver id. When present, include it in `lark.body.receive_id`.
- `receiveIdType`: optional Lark receiver id type. Default to `open_id`.

The four record arrays may contain raw Lark Bitable response items or extracted field objects. If a record has `fields`, use `record.fields`; otherwise use the record itself.

## Required field normalization

Use these deterministic field mappings in order:

- Date: `日期`, `date`, `Date`, `period`, `month`.
- Category: `一级类目`, `category`, `Category`, `project`, `Project`, `department`, `team`.
- Business unit: `BU`, `bu`, `businessUnit`, `business_unit`, `team`, `department`.
- Amount: `支出金额(USD)`, `amount`, `Amount`, `budget`, `planned`, `actual`, `spent`, `cost`.

If a category is absent, use `Unknown`. If a BU is absent, use `Unknown`.

## Deterministic algorithm

Run the equivalent of this algorithm. Do not invent alternative formulas.

```javascript
function extractRecords(rawRecords) {
  return (rawRecords || []).map(function (item) {
    return item && item.fields ? item.fields : item;
  });
}

function firstValue(record, names) {
  for (var i = 0; i < names.length; i++) {
    var value = record[names[i]];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function parseAmount(value) {
  if (typeof value === 'number') return value;
  if (value === undefined || value === null || value === '') return 0;
  var text = String(value).replace(/[,\s\"]/g, '');
  if (text.startsWith('(') && text.endsWith(')')) return -(parseFloat(text.slice(1, -1)) || 0);
  return parseFloat(text) || 0;
}

function normalizeDate(value) {
  if (!value) return '';
  var text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) return text.replace(/\//g, '-');
  var dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    var day = dmy[1].padStart(2, '0');
    var month = dmy[2].padStart(2, '0');
    var year = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
    return year + '-' + month + '-' + day;
  }
  return text;
}

function normalizeRows(rawRecords) {
  return extractRecords(rawRecords).map(function (record) {
    return {
      date: normalizeDate(firstValue(record, ['日期', 'date', 'Date', 'period', 'month'])),
      category: String(firstValue(record, ['一级类目', 'category', 'Category', 'project', 'Project', 'department', 'team']) || 'Unknown'),
      businessUnit: String(firstValue(record, ['BU', 'bu', 'businessUnit', 'business_unit', 'team', 'department']) || 'Unknown'),
      amount: parseAmount(firstValue(record, ['支出金额(USD)', 'amount', 'Amount', 'budget', 'planned', 'actual', 'spent', 'cost']))
    };
  });
}

function maxDate(rows) {
  var dates = rows.map(function (row) { return row.date || ''; }).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : '';
}

function filterToCutoff(rows, cutoff) {
  if (!cutoff) return rows;
  return rows.filter(function (row) { return !row.date || row.date <= cutoff; });
}

function aggregate(rows, keyName) {
  var result = {};
  rows.forEach(function (row) {
    var key = row[keyName] || 'Unknown';
    result[key] = (result[key] || 0) + row.amount;
  });
  return result;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function computeVariance(plannedByGroup, actualByGroup, thresholds) {
  var keys = Object.keys(plannedByGroup);
  Object.keys(actualByGroup).forEach(function (key) {
    if (keys.indexOf(key) === -1) keys.push(key);
  });
  return keys.map(function (key) {
    var planned = plannedByGroup[key] || 0;
    var actual = actualByGroup[key] || 0;
    var usagePercent = planned > 0 ? round2(actual / planned * 100) : (actual > 0 ? -1 : 0);
    var variance = round2(actual - planned);
    var variancePercent = planned > 0 ? round2(variance / planned * 100) : (actual > 0 ? -1 : 0);
    var level = 'ok';
    if (usagePercent === -1 || usagePercent >= thresholds.critical) level = 'critical';
    else if (usagePercent >= thresholds.warning) level = 'warning';
    else if (usagePercent >= thresholds.watch) level = 'watch';
    return {
      group: key,
      planned: round2(planned),
      actual: round2(actual),
      variance: variance,
      usagePercent: usagePercent,
      variancePercent: variancePercent,
      level: level
    };
  }).sort(function (a, b) {
    var ap = a.usagePercent === -1 ? 999999 : a.usagePercent;
    var bp = b.usagePercent === -1 ? 999999 : b.usagePercent;
    return bp - ap;
  });
}
```

## Processing steps

1. Normalize all four record arrays with `normalizeRows`.
2. Compute `coreCutoff` from normalized core actual rows and `aelfCutoff` from normalized aelf actual rows.
3. Use each actual cutoff to filter the matching budget rows. Do not filter actual rows.
4. Compute category variance for core and aelf with `category` as the group key.
5. Compute business unit variance for core with `businessUnit` as the group key.
6. Compute totals from the filtered budget rows and actual rows.
7. Create highlights from all groups where `level` is `critical`, `warning`, or `watch`.
8. Create a Lark interactive card with deterministic sections for core category variance, aelf category variance, and core BU variance.

## Output contract

Return JSON with this shape:

```json
{
  "message_type": "interactive",
  "summary": "Budget variance summary for <period>",
  "severity": "info|warning|critical",
  "period": "<period>",
  "currency": "USD",
  "thresholds": {
    "watchPercent": 80,
    "warningPercent": 100,
    "criticalPercent": 120
  },
  "dataCutoff": "YYYY-MM-DD",
  "totals": {
    "planned": 0,
    "actual": 0,
    "variance": 0,
    "usagePercent": 0,
    "variancePercent": 0
  },
  "sections": {
    "core": {
      "totalBudget": 0,
      "totalActual": 0,
      "variance": []
    },
    "aelf": {
      "totalBudget": 0,
      "totalActual": 0,
      "variance": []
    },
    "coreByBusinessUnit": []
  },
  "highlights": [
    {
      "scope": "core|aelf|coreByBusinessUnit",
      "group": "<category or BU>",
      "planned": 0,
      "actual": 0,
      "variance": 0,
      "usagePercent": 0,
      "variancePercent": 0,
      "level": "watch|warning|critical",
      "reason": "<short deterministic explanation>"
    }
  ],
  "lark": {
    "msg_type": "interactive",
    "body": {
      "receive_id": "<receiveId when provided>",
      "msg_type": "interactive",
      "content": "<JSON string of card>"
    },
    "card": {
      "config": { "wide_screen_mode": true },
      "header": {
        "title": { "tag": "plain_text", "content": "Budget variance summary" },
        "template": "green|orange|red"
      },
      "elements": []
    }
  }
}
```

Use `severity=critical` when any group is critical, `warning` when any group is warning or watch, otherwise `info`. Use Lark header template `red` for critical, `orange` for warning, and `green` for info.

## Failure behavior

If any of the four record arrays is missing, return:

```json
{
  "needs_more_information": true,
  "missing": ["coreBudgetRecords"]
}
```

Do not invent records, table ids, credentials, app tokens, or receiver ids.
