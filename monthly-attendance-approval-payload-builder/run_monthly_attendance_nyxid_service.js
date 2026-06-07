#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const { buildPayload } = require('./build_monthly_attendance_payload');

const H = {
  appToken: 'x-attendance-bitable-app-token',
  tableId: 'x-attendance-table-id',
  docUrl: 'x-attendance-doc-url',
  approvalCode: 'x-attendance-approval-code',
  submitterId: 'x-attendance-submitter-id',
  notifyUserId: 'x-attendance-notify-user-id',
  year: 'x-attendance-year',
  month: 'x-attendance-month',
  monthLabel: 'x-attendance-month-label',
  recordsAlreadyFiltered: 'x-attendance-records-already-filtered',
  widgetDescId: 'x-attendance-widget-desc-id',
  widgetLinkId: 'x-attendance-widget-link-id',
  pageSize: 'x-attendance-page-size'
};

function nyxid(args, input) {
  return execFileSync('nyxid', args, { input, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}
function parseJson(text) { return text && text.trim() ? JSON.parse(text) : {}; }
function serviceShow(serviceSlug) { return parseJson(nyxid(['service', 'show', serviceSlug, '--output', 'json'])); }
function headerValue(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (typeof raw === 'object') {
    for (const key of ['value', 'Value', 'header_value']) if (raw[key] !== undefined && raw[key] !== null) return String(raw[key]);
  }
  return String(raw);
}
function collectHeaders(service) {
  const candidates = [service.default_request_headers, service.defaultRequestHeaders, service.default_headers, service.defaultHeaders, service.headers, service.config && service.config.default_headers];
  const result = {};
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const name = item.name || item.key || item.header || item.Name || item.Key;
        if (name) result[String(name).toLowerCase()] = headerValue(item.value ?? item.Value ?? item);
      }
    } else if (typeof candidate === 'object') {
      for (const [key, value] of Object.entries(candidate)) result[String(key).toLowerCase()] = headerValue(value);
    }
  }
  return result;
}
function numberOr(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function boolValue(value) { return String(value || '').toLowerCase() === 'true'; }
function nowParts() { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1 }; }
function proxyRequest(serviceSlug, path, method, body) {
  const args = ['proxy', 'request', serviceSlug, path, '-m', method, '--output', 'json'];
  if (body !== undefined) args.push('-d', JSON.stringify(body));
  return parseJson(nyxid(args));
}
function responseData(response) { return response && response.data && response.data.data ? response.data : response; }
function fetchRecords(serviceSlug, appToken, tableId, pageSize) {
  const items = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ page_size: String(pageSize) });
    if (pageToken) params.set('page_token', pageToken);
    const path = `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records?${params.toString()}`;
    const raw = proxyRequest(serviceSlug, path, 'GET');
    const data = responseData(raw).data || responseData(raw);
    if (Array.isArray(data.items)) items.push(...data.items);
    pageToken = data.has_more ? (data.page_token || '') : '';
  } while (pageToken);
  return items;
}
function required(headers, mode) {
  const missing = [];
  if (mode === 'reminder') {
    if (!headers[H.notifyUserId]) missing.push(H.notifyUserId);
    return missing;
  }
  for (const key of [H.appToken, H.tableId, H.docUrl, H.approvalCode, H.submitterId]) if (!headers[key]) missing.push(key);
  return missing;
}
function instanceCodeFrom(response) {
  const data = (responseData(response).data || responseData(response) || {});
  return data.instance_code || data.instanceCode || data.code || null;
}
function run(input) {
  const serviceSlug = input.serviceSlug || input.configService || input.nyxidServiceSlug;
  if (!serviceSlug) return { needs_more_information: true, missing: ['serviceSlug'] };
  const mode = input.mode || 'approval';
  const dryRun = Boolean(input.dryRun);
  const headers = collectHeaders(serviceShow(serviceSlug));
  const missing = required(headers, mode);
  if (missing.length) return { needs_more_information: true, missing };
  const parts = nowParts();
  const year = numberOr(input.year ?? headers[H.year], parts.year);
  const month = numberOr(input.month ?? headers[H.month], parts.month);
  if (mode === 'reminder') {
    const payload = buildPayload({ mode: 'reminder', year, month, notifyUserId: input.notifyUserId || headers[H.notifyUserId] });
    let notificationResponse = null;
    if (!dryRun) notificationResponse = proxyRequest(serviceSlug, payload.lark.path, 'POST', payload.lark.body);
    return { serviceSlug, mode, dryRun, submitted: false, notified: !dryRun, notificationResponse, payload };
  }
  const pageSize = numberOr(headers[H.pageSize], 500);
  const records = fetchRecords(serviceSlug, headers[H.appToken], headers[H.tableId], pageSize);
  const payload = buildPayload({
    records,
    year,
    month,
    monthLabel: input.monthLabel || headers[H.monthLabel],
    recordsAlreadyFiltered: input.recordsAlreadyFiltered ?? boolValue(headers[H.recordsAlreadyFiltered]),
    docUrl: input.docUrl || headers[H.docUrl],
    approvalCode: input.approvalCode || headers[H.approvalCode],
    submitterId: input.submitterId || headers[H.submitterId],
    notifyUserId: input.notifyUserId || headers[H.notifyUserId],
    widgetDescId: input.widgetDescId || headers[H.widgetDescId],
    widgetLinkId: input.widgetLinkId || headers[H.widgetLinkId]
  });
  if (payload.needs_more_information) return payload;
  let approvalResponse = null;
  let notificationResponse = null;
  let instanceCode = null;
  if (!dryRun) {
    approvalResponse = proxyRequest(serviceSlug, payload.lark.approvalPath, 'POST', payload.lark.approvalBody);
    instanceCode = instanceCodeFrom(approvalResponse);
    if (payload.lark.notificationBody && headers[H.notifyUserId]) {
      const notificationPayload = buildPayload({
        records,
        year,
        month,
        monthLabel: input.monthLabel || headers[H.monthLabel],
        recordsAlreadyFiltered: input.recordsAlreadyFiltered ?? boolValue(headers[H.recordsAlreadyFiltered]),
        docUrl: input.docUrl || headers[H.docUrl],
        approvalCode: input.approvalCode || headers[H.approvalCode],
        submitterId: input.submitterId || headers[H.submitterId],
        notifyUserId: input.notifyUserId || headers[H.notifyUserId],
        widgetDescId: input.widgetDescId || headers[H.widgetDescId],
        widgetLinkId: input.widgetLinkId || headers[H.widgetLinkId],
        instanceCode
      });
      notificationResponse = proxyRequest(serviceSlug, notificationPayload.lark.notificationPath, 'POST', notificationPayload.lark.notificationBody);
    }
  }
  return { serviceSlug, mode, dryRun, submitted: !dryRun, notified: Boolean(notificationResponse), instanceCode, approvalResponse, notificationResponse, payload };
}

if (require.main === module) {
  const input = process.argv[2] ? { serviceSlug: process.argv[2], mode: process.argv[3] || 'approval' } : parseJson(require('fs').readFileSync(0, 'utf8'));
  process.stdout.write(`${JSON.stringify(run(input), null, 2)}\n`);
}
module.exports = { run };
