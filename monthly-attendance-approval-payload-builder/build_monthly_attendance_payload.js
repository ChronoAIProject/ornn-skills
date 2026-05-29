#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readInput() {
  const text = fs.readFileSync(0, 'utf8');
  return text.trim() ? JSON.parse(text) : {};
}

function fieldsOf(record) {
  return record && record.fields ? record.fields : record;
}

function firstText(value) {
  if (Array.isArray(value)) return value[0] && value[0].text ? value[0].text : '';
  return value === undefined || value === null ? '' : String(value);
}

function numberValue(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function summarize(records) {
  let workDays = 0;
  let resignCount = 0;
  let leaveCount = 0;
  let sickCount = 0;
  for (const item of records || []) {
    const f = fieldsOf(item) || {};
    const days = numberValue(f['应出勤天数']);
    if (workDays === 0 && days > 0) workDays = days;
    if (firstText(f['人员情况']) === '离职') resignCount += 1;
    if (numberValue(f['事假(天）']) > 0) leaveCount += 1;
    if (numberValue(f['病假（天）']) > 0) sickCount += 1;
  }
  return { workDays, resignCount, leaveCount, sickCount };
}

function messageBody(receiveId, card) {
  return { receive_id: receiveId, msg_type: 'interactive', content: JSON.stringify(card) };
}

function buildApproval(input) {
  const year = input.year || new Date().getFullYear();
  const month = input.month || (new Date().getMonth() + 1);
  const monthLabel = input.monthLabel || `${year}年${month}月`;
  const allRecords = input.records || [];
  const records = input.recordsAlreadyFiltered ? allRecords : allRecords.filter((r) => fieldsOf(r)['月份'] === monthLabel);
  if (!records.length) return { needs_more_information: true, missing: ['records'] };
  const docUrl = input.docUrl || input.doc_url;
  if (!docUrl) return { needs_more_information: true, missing: ['docUrl'] };
  const approvalCode = input.approvalCode || input.approval_code || '3F02FB04-3919-4089-B42B-B1B557820EB5';
  const submitterId = input.submitterId || input.submitter_id || 'ee689459';
  const notifyUserId = input.notifyUserId || input.notify_user_id || '831cg5af';
  const widgetDescId = input.widgetDescId || input.widget_desc_id || 'widget17195537488110001';
  const widgetLinkId = input.widgetLinkId || input.widget_link_id || 'widget17174729080890001';
  const stats = summarize(records);
  const description = `${year}年${month}月出勤天数：${stats.workDays}天 （单休）\n\n离职人员：${stats.resignCount} 人\n\n事假：${stats.leaveCount} 人\n\n病假：${stats.sickCount} 人\n\n【via lark-cli (auto-generated)】`;
  const form = [
    { id: widgetDescId, type: 'textarea', value: description },
    { id: widgetLinkId, type: 'input', value: docUrl }
  ];
  const card = {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: `✅ ${year}年${month}月 中国区考勤审批已提交` }, template: 'blue' },
    elements: [
      { tag: 'div', fields: [
        { is_short: true, text: { tag: 'lark_md', content: `**出勤天数**\n${stats.workDays} 天（单休）` } },
        { is_short: true, text: { tag: 'lark_md', content: `**离职人员**\n${stats.resignCount} 人` } },
        { is_short: true, text: { tag: 'lark_md', content: `**事假**\n${stats.leaveCount} 人` } },
        { is_short: true, text: { tag: 'lark_md', content: `**病假**\n${stats.sickCount} 人` } }
      ] },
      { tag: 'hr' },
      { tag: 'action', actions: [{ tag: 'button', text: { tag: 'plain_text', content: '查看考勤表' }, type: 'primary', url: docUrl }] },
      { tag: 'note', elements: [{ tag: 'plain_text', content: `审批编号: ${input.instanceCode || '—'} | 由 n8n 自动提交` }] }
    ]
  };
  return {
    message_type: 'lark_monthly_attendance_approval',
    monthLabel,
    stats,
    description,
    form,
    lark: {
      approvalPath: '/open-apis/approval/v4/instances',
      approvalBody: { approval_code: approvalCode, user_id: submitterId, form: JSON.stringify(form) },
      notificationPath: '/open-apis/im/v1/messages?receive_id_type=user_id',
      notificationBody: notifyUserId ? messageBody(notifyUserId, card) : undefined
    }
  };
}

function buildReminder(input) {
  const now = new Date();
  const year = input.year || now.getFullYear();
  const month = input.month || (now.getMonth() + 1);
  const notifyUserId = input.notifyUserId || input.notify_user_id || '831cg5af';
  if (!notifyUserId) return { needs_more_information: true, missing: ['notifyUserId'] };
  const daysLeft = input.daysLeft ?? (new Date(year, month, 0).getDate() - now.getDate());
  const card = {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: `⏰ ${year}年${month}月 考勤数据填写提醒` }, template: 'orange' },
    elements: [{ tag: 'div', text: { tag: 'lark_md', content: `距月末还有 **${daysLeft} 天**，请在月底前完成核对：\n\n☐ 每人「实出勤天数」已更新\n☐ 事假、病假天数已填写\n☐ 离职人员状态已更新\n\n月末最后一天 **10:00** 将自动提交飞书审批` } }]
  };
  return { message_type: 'lark_monthly_attendance_reminder', lark: { path: '/open-apis/im/v1/messages?receive_id_type=user_id', body: messageBody(notifyUserId, card) } };
}

function buildPayload(input) {
  return input.mode === 'reminder' ? buildReminder(input) : buildApproval(input);
}

if (require.main === module) process.stdout.write(`${JSON.stringify(buildPayload(readInput()), null, 2)}\n`);
module.exports = { buildPayload };
