# Onboarding email approval contract

This contract defines the deterministic behavior for `lark-onboarding-email-approval-payload-builder`.

## Original flow boundary

The original n8n flow has five linear steps:

1. Receive a POST webhook from Lark/Base.
2. Extract and format onboarding fields.
3. Fetch a Lark tenant access token.
4. Call `POST /open-apis/approval/v4/instances`.
5. Return a small success JSON response.

This skill implements step 2 only and returns a connector-ready body for step 4. Token exchange and API submission stay in NyxID/Aevatar.

## Input shape

The caller may pass the event body directly or wrap it in `body`. If `body` exists, read fields from `body`; otherwise read fields from the root object.

## Field aliases

Use the first non-empty value in the listed order.

| Normalized field | Source fields |
|---|---|
| `larkName` | `Lark Name`, `larkName`, `lark_name`, `employeeName`, `name`, `newHireName` |
| `department` | `Department`, `department`, `team` |
| `startDate` | `Onboarding Date`, `onboardingDate`, `onboarding_date`, `startDate`, `start_date` |
| `operatorId` | `operator_id`, `operatorId`, `user_id`, `userId`, `open_id`, `openId` |
| `approvalCode` | `approval_code`, `approvalCode` |
| `companyDomain` | `companyDomain`, `company_domain`, `emailDomain`, `email_domain`, `domain` |
| `requestDate` | `requestDate`, `request_date`, `today` |
| `autoSubmitLabel` | `autoSubmitLabel`, `auto_submit_label` |

## Defaults

```json
{
  "approvalCode": "9C330885-C70A-4A5D-913A-CBA9A142FFD4",
  "companyDomain": "aelf.io",
  "autoSubmitLabel": "自动提交"
}
```

If `requestDate` is absent, use the execution date formatted as Chinese date text, equivalent to JavaScript:

```javascript
new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
```

Callers that need fully repeatable test output should pass `requestDate` explicitly.

## Email generation

Generate the mailbox local part from `larkName`:

```text
emailName = lower(larkName).replace(one-or-more-whitespace, ".").remove(any char except a-z, 0-9, dot)
newEmail = emailName + "@" + companyDomain
```

For example:

| `larkName` | `companyDomain` | `newEmail` |
|---|---|---|
| `Alice Wang` | `aelf.io` | `alice.wang@aelf.io` |
| `Bob-Z Chen` | `aelf.io` | `bobz.chen@aelf.io` |

## Request detail

Build `requestDetail` exactly as:

```text
申请日期：<requestDate> | 姓名：<larkName>（入职：<startDate>）| 新邮箱：<newEmail>
```

## Lark form widgets

Build the Lark `form` as a JSON string of this array:

```json
[
  { "id": "widget17163600360780001", "type": "textarea", "value": "<requestDetail>" },
  { "id": "widget17163600454870001", "type": "input", "value": "<autoSubmitLabel>" }
]
```

## Lark approval body

Build the connector-ready request body as:

```json
{
  "approval_code": "<approvalCode>",
  "user_id": "<operatorId>",
  "form": "<JSON string form>"
}
```

## Output shape

Return a JSON object with:

```json
{
  "message_type": "lark_approval_instance",
  "summary": "Onboarding email approval for <larkName>",
  "employee": {
    "larkName": "<larkName>",
    "department": "<department>",
    "startDate": "<startDate>",
    "operatorId": "<operatorId>"
  },
  "emailRequest": {
    "address": "<newEmail>",
    "domain": "<companyDomain>"
  },
  "requestDetail": "<requestDetail>",
  "form": [
    { "id": "widget17163600360780001", "type": "textarea", "value": "<requestDetail>" },
    { "id": "widget17163600454870001", "type": "input", "value": "<autoSubmitLabel>" }
  ],
  "lark": {
    "path": "/open-apis/approval/v4/instances",
    "body": {
      "approval_code": "<approvalCode>",
      "user_id": "<operatorId>",
      "form": "<JSON string form>"
    }
  }
}
```

## Missing fields

If any required field is missing or empty, return:

```json
{
  "needs_more_information": true,
  "missing": ["larkName", "department", "startDate", "operatorId"]
}
```
