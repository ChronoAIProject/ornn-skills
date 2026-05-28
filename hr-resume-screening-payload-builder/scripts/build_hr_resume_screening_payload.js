#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readInput() {
  const text = fs.readFileSync(0, 'utf8');
  return text.trim() ? JSON.parse(text) : {};
}

function firstValue(record, names) {
  for (const name of names) {
    const value = record ? record[name] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function normalizeInput(input) {
  return {
    candidateName: String(firstValue(input, ['Candidate Name', 'candidateName', 'candidate_name', 'name']) || 'Unknown'),
    email: String(firstValue(input, ['Email', 'email']) || ''),
    jobTitle: String(firstValue(input, ['Job Title', 'jobTitle', 'job_title', 'role']) || ''),
    jobDescription: String(firstValue(input, ['Job Description', 'jobDescription', 'job_description']) || ''),
    resumeText: String(firstValue(input, ['resumeText', 'resume_text', 'text']) || 'Could not extract text from resume PDF')
  };
}

function buildPrompt(input) {
  const meta = normalizeInput(input);
  if (!meta.jobTitle) return { needs_more_information: true, missing: ['jobTitle'] };
  const jd = meta.jobDescription.trim() !== '' ? meta.jobDescription : `请根据职位名称"${meta.jobTitle}"自行判断该岗位的核心要求进行评估`;
  const prompt = `You are a professional HR recruitment consultant. Carefully evaluate whether this candidate's resume meets the job requirements and provide a score.\n\nJob Title: ${meta.jobTitle}\nJob Description: ${jd}\n\n[CANDIDATE RESUME CONTENT]\n${meta.resumeText.substring(0, 3500)}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation text before or after.\n{\n  "score": <integer between 0 and 100>,\n  "candidate_name": "<extract full name from resume, or use: ${meta.candidateName}>",\n  "strengths": "<top 2-3 strengths relevant to the role, max 80 chars>",\n  "gaps": "<top 1-2 gaps or missing requirements, max 80 chars>",\n  "recommendation": "<Pass or Fail>"\n}`;
  return {
    message_type: 'hr_resume_screening_prompt',
    groqRequest: { model: input.model || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] },
    meta: { formName: meta.candidateName, email: meta.email, jobTitle: meta.jobTitle }
  };
}

function parseAiResponse(input) {
  const meta = input.meta || normalizeInput(input);
  const response = input.response || input;
  let rawText = '';
  if (typeof response === 'string') rawText = response;
  else rawText = (((response.choices || [])[0] || {}).message || {}).content || response.content || '{}';
  let cleanText = String(rawText).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleanText = jsonMatch[0];
  let parsed;
  try { parsed = JSON.parse(cleanText); }
  catch (_) { return { needs_more_information: true, missing: ['validAiJson'] }; }
  const score = Number(parsed.score) || 0;
  const recommendation = parsed.recommendation || '';
  const strengths = parsed.strengths || '';
  const gaps = parsed.gaps || '';
  const candidateName = parsed.candidate_name || meta.formName || meta.candidateName || 'Unknown';
  return {
    message_type: 'hr_resume_screening_result',
    score,
    action: score >= (input.passThreshold || 60) ? 'upload_to_lark' : 'skip_upload',
    candidateName,
    email: meta.email || '',
    jobTitle: meta.jobTitle || '',
    strengths,
    gaps,
    recommendation,
    screenerRemarks: `AI Score: ${score}/100 | ${recommendation} | Strengths: ${strengths} | Gaps: ${gaps}`,
    uploadDateMs: input.uploadDateMs || Date.now()
  };
}

function buildLarkRecord(input) {
  const data = input.screening || input;
  const fields = {
    'Candidate Name': data.candidateName,
    'Email': data.email || '',
    'Job Title': data.jobTitle,
    'Upload Date': data.uploadDateMs || Date.now(),
    'Position Status': 'Open',
    'Application Stage': 'Resume Screening',
    'TA Notes': data.screenerRemarks || ''
  };
  if (data.fileToken || data.file_token) fields.Resume = [{ file_token: data.fileToken || data.file_token }];
  return {
    message_type: 'lark_bitable_record_payload',
    lark: {
      appToken: input.appToken || 'FSl0bCi9raBuLbsdTbHlgb0agwf',
      tableId: input.tableId || 'tblgZgSqmeBag2na',
      createPath: `/open-apis/bitable/v1/apps/${input.appToken || 'FSl0bCi9raBuLbsdTbHlgb0agwf'}/tables/${input.tableId || 'tblgZgSqmeBag2na'}/records`,
      body: { fields }
    }
  };
}

function buildPayload(input) {
  if (input.mode === 'parse_ai_response') return parseAiResponse(input);
  if (input.mode === 'build_lark_record') return buildLarkRecord(input);
  return buildPrompt(input);
}

if (require.main === module) process.stdout.write(`${JSON.stringify(buildPayload(readInput()), null, 2)}\n`);
module.exports = { buildPayload };
