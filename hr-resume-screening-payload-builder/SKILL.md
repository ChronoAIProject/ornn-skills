---
name: hr-resume-screening-payload-builder
version: "1.0"
description: Builds HR resume screening LLM prompts and Lark Base record payloads from form input, extracted resume text, and parsed AI score results.
metadata:
  category: plain
  tag:
    - aevatar
    - s-capability
    - hr
    - resume-screening
    - lark-bitable
    - payload-builder
  clawdbot:
    emoji: "briefcase"
    files:
      - "references/*"
      - "scripts/*"
---

# HR Resume Screening Payload Builder

Use this skill when a resume upload flow needs deterministic prompt construction and Lark Base record payload construction.

This skill does not extract PDF text, call an LLM, upload files, or write Lark records. It builds the request payloads around those connector calls.

## Modes

- `build_prompt`: build the LLM scoring prompt and request body from form fields and extracted resume text.
- `parse_ai_response`: parse the model response into normalized screening fields.
- `build_lark_record`: build Lark Bitable record create/update fields.

See `references/hr-resume-screening-contract.md` for exact behavior.

## Determinism requirement

Follow `references/hr-resume-screening-contract.md`. If executing code is allowed, use `scripts/build_hr_resume_screening_payload.js` as the reference implementation.

Do not invent resume content, candidate data, Lark app/table ids, file tokens, or model scores.
