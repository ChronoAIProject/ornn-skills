# Monthly attendance approval contract

This contract defines deterministic behavior for `monthly-attendance-approval-payload-builder`.

## Original n8n flow

The original workflow has two schedule paths:

1. On the last day of the month, read attendance records, create a Lark approval instance, and send a DM notification.
2. On the 27th, send a reminder DM.

This skill implements approval and reminder payload construction. Runner mode performs the external Lark calls through NyxID proxy.

## Defaults

```json
{
  "approvalCode": "3F02FB04-3919-4089-B42B-B1B557820EB5",
  "submitterId": "ee689459",
  "notifyUserId": "831cg5af",
  "widgetDescId": "widget17195537488110001",
  "widgetLinkId": "widget17174729080890001",
  "widgetDateId": "widget17167976379680001"
}
```

The approval body intentionally excludes the date widget because the original workflow marks it read-only.

## Record filtering

The caller should fetch Bitable records. The skill filters records whose field `月份` equals `<year>年<month>月` unless the caller already passes only the monthly records.

Each record may be either a Lark record with `fields`, or a field object.

## Statistics

- `workDays`: first positive numeric `应出勤天数`.
- `resignCount`: count records where `人员情况` equals `离职`. If it is an array, use first item text.
- `leaveCount`: count records where `事假(天）` > 0.
- `sickCount`: count records where `病假（天）` > 0.

## Description

Build approval description exactly as:

```text
<year>年<month>月出勤天数：<workDays>天 （单休）

离职人员：<resignCount> 人

事假：<leaveCount> 人

病假：<sickCount> 人

【via lark-cli (auto-generated)】
```

## Approval body

Build connector-ready body for:

```text
POST /open-apis/approval/v4/instances
```

```json
{
  "approval_code": "<approvalCode>",
  "user_id": "<submitterId>",
  "form": "<JSON string>"
}
```

Form array before stringification:

```json
[
  { "id": "<widgetDescId>", "type": "textarea", "value": "<description>" },
  { "id": "<widgetLinkId>", "type": "input", "value": "<docUrl>" }
]
```

## Notification card

After approval creation, callers may pass `instanceCode`. Build a Lark interactive message body for `receive_id_type=user_id` with `receive_id = notifyUserId`.

## Reminder mode

For reminder mode, build a Lark interactive card that reminds the target user to update attendance data before month end.
