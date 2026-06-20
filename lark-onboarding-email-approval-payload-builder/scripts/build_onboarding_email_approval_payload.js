#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readInput() {
  const text = fs.readFileSync(0, 'utf8');
  return text.trim() ? JSON.parse(text) : {};
}

function source(input) {
  return input && input.body && typeof input.body === 'object' ? input.body : input;
}

function firstValue(record, names) {
  for (const name of names) {
    const value = record ? record[name] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function chineseDate(value) {
  if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function emailFromName(larkName, companyDomain) {
  const localPart = String(larkName).toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
  return `${localPart}@${companyDomain}`;
}

function buildPayload(input) {
  const record = source(input || {});
  const fields = {
    larkName: firstValue(record, ['Lark Name', 'larkName', 'lark_name', 'employeeName', 'name', 'newHireName']),
    department: firstValue(record, ['Department', 'department', 'team']),
    startDate: firstValue(record, ['Onboarding Date', 'onboardingDate', 'onboarding_date', 'startDate', 'start_date']),
    operatorId: firstValue(record, ['operator_id', 'operatorId', 'user_id', 'userId', 'open_id', 'openId'])
  };

  const missing = Object.entries(fields).filter(([, value]) => value === undefined || value === null || String(value).trim() === '').map(([key]) => key);
  if (missing.length) return { needs_more_information: true, missing };

  const larkName = String(fields.larkName).trim();
  const department = String(fields.department).trim();
  const startDate = String(fields.startDate).trim();
  const operatorId = String(fields.operatorId).trim();
  const approvalCode = String(firstValue(record, ['approval_code', 'approvalCode']) || '9C330885-C70A-4A5D-913A-CBA9A142FFD4').trim();
  const companyDomain = String(firstValue(record, ['companyDomain', 'company_domain', 'emailDomain', 'email_domain', 'domain']) || 'aelf.io').trim();
  const autoSubmitLabel = String(firstValue(record, ['autoSubmitLabel', 'auto_submit_label']) || '自动提交');
  const requestDate = chineseDate(firstValue(record, ['requestDate', 'request_date', 'today']));
  const newEmail = emailFromName(larkName, companyDomain);
  const requestDetail = `申请日期：${requestDate} | 姓名：${larkName}（入职：${startDate}）| 新邮箱：${newEmail}`;
  const form = [
    { id: 'widget17163600360780001', type: 'textarea', value: requestDetail },
    { id: 'widget17163600454870001', type: 'input', value: autoSubmitLabel }
  ];
  const formPayload = JSON.stringify(form);

  return {
    message_type: 'lark_approval_instance',
    summary: `Onboarding email approval for ${larkName}`,
    employee: { larkName, department, startDate, operatorId },
    emailRequest: { address: newEmail, domain: companyDomain },
    requestDetail,
    form,
    lark: {
      path: '/open-apis/approval/v4/instances',
      body: {
        approval_code: approvalCode,
        user_id: operatorId,
        form: formPayload
      }
    }
  };
}

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(buildPayload(readInput()), null, 2)}\n`);
}

module.exports = { buildPayload };
