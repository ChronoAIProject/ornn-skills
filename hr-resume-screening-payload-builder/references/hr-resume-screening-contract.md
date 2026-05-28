# HR resume screening contract

This contract defines deterministic behavior for `hr-resume-screening-payload-builder`.

## Original n8n flow

The original workflow:

1. Receives form input with candidate name, email, job title, PDF resume, and optional job description.
2. Extracts PDF text.
3. Builds a Groq LLM scoring request.
4. Parses model JSON response.
5. If score is at least 60, uploads resume to Lark Drive and creates or updates a Lark Bitable record.

This skill implements prompt construction, response parsing, and record payload construction only.

## Input aliases

| Normalized field | Source fields |
|---|---|
| `candidateName` | `Candidate Name`, `candidateName`, `candidate_name`, `name` |
| `email` | `Email`, `email` |
| `jobTitle` | `Job Title`, `jobTitle`, `job_title`, `role` |
| `jobDescription` | `Job Description`, `jobDescription`, `job_description` |
| `resumeText` | `resumeText`, `resume_text`, `text` |

## Prompt request

Use model `llama-3.3-70b-versatile` by default.

If `jobDescription` is empty, use:

```text
请根据职位名称"<jobTitle>"自行判断该岗位的核心要求进行评估
```

Resume text is truncated to 3500 characters.

The model must be instructed to return only valid JSON with:

```json
{
  "score": 0,
  "candidate_name": "<name>",
  "strengths": "<max 80 chars>",
  "gaps": "<max 80 chars>",
  "recommendation": "Pass or Fail"
}
```

## AI response parsing

Strip markdown code fences, extract the first JSON object, parse it, and normalize:

- `score`: number, default `0`
- `candidateName`: `candidate_name` or original form name
- `recommendation`: string
- `screenerRemarks`: `AI Score: <score>/100 | <recommendation> | Strengths: <strengths> | Gaps: <gaps>`

## Score threshold

Default pass threshold is `60`. If score is lower, return `action: "skip_upload"`.

## Lark record fields

Build fields:

```json
{
  "Candidate Name": "<candidateName>",
  "Email": "<email>",
  "Job Title": "<jobTitle>",
  "Upload Date": 0,
  "Position Status": "Open",
  "Application Stage": "Resume Screening",
  "TA Notes": "<screenerRemarks>",
  "Resume": [{ "file_token": "<fileToken>" }]
}
```

Include `Resume` only when `fileToken` exists.

Default Lark destination from the source workflow:

```json
{
  "appToken": "FSl0bCi9raBuLbsdTbHlgb0agwf",
  "tableId": "tblgZgSqmeBag2na",
  "parentNode": "FSl0bCi9raBuLbsdTbHlgb0agwf"
}
```
