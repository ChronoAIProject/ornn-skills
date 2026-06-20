#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const { buildPayload } = require('./build_budget_variance_payload');

const HEADER_KEYS = {
  appToken: 'x-budget-bitable-app-token',
  coreBudget: 'x-budget-core-budget-table-id',
  coreActual: 'x-budget-core-actual-table-id',
  aelfBudget: 'x-budget-aelf-budget-table-id',
  aelfActual: 'x-budget-aelf-actual-table-id',
  receiveId: 'x-budget-receive-id',
  receiveIdType: 'x-budget-receive-id-type',
  period: 'x-budget-period',
  currency: 'x-budget-currency',
  watch: 'x-budget-watch-threshold-percent',
  alert: 'x-budget-alert-threshold-percent',
  critical: 'x-budget-critical-threshold-percent',
  pageSize: 'x-budget-page-size'
};

function nyxid(args, input) {
  return execFileSync('nyxid', args, { input, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}

function parseJson(text) {
  return text && text.trim() ? JSON.parse(text) : {};
}

function serviceShow(serviceSlug) {
  return parseJson(nyxid(['service', 'show', serviceSlug, '--output', 'json']));
}

function headerValue(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (typeof raw === 'object') {
    for (const key of ['value', 'Value', 'header_value']) {
      if (raw[key] !== undefined && raw[key] !== null) return String(raw[key]);
    }
  }
  return String(raw);
}

function collectHeaders(service) {
  const candidates = [service.default_headers, service.defaultHeaders, service.default_request_headers, service.defaultRequestHeaders, service.headers, service.config && service.config.default_headers];
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

function requiredConfig(headers) {
  const missing = [HEADER_KEYS.appToken, HEADER_KEYS.coreBudget, HEADER_KEYS.coreActual, HEADER_KEYS.aelfBudget, HEADER_KEYS.aelfActual].filter((key) => !headers[key]);
  if (missing.length) return { needs_more_information: true, missing };
  return {
    appToken: headers[HEADER_KEYS.appToken],
    coreBudgetTableId: headers[HEADER_KEYS.coreBudget],
    coreActualTableId: headers[HEADER_KEYS.coreActual],
    aelfBudgetTableId: headers[HEADER_KEYS.aelfBudget],
    aelfActualTableId: headers[HEADER_KEYS.aelfActual],
    receiveId: headers[HEADER_KEYS.receiveId],
    receiveIdType: headers[HEADER_KEYS.receiveIdType] || 'open_id',
    period: headers[HEADER_KEYS.period],
    currency: headers[HEADER_KEYS.currency] || 'USD',
    watchThresholdPercent: numberOr(headers[HEADER_KEYS.watch], 80),
    alertThresholdPercent: numberOr(headers[HEADER_KEYS.alert], 100),
    criticalThresholdPercent: numberOr(headers[HEADER_KEYS.critical], 120),
    pageSize: numberOr(headers[HEADER_KEYS.pageSize], 500)
  };
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function proxyRequest(serviceSlug, path, method, body) {
  const args = ['proxy', 'request', serviceSlug, path, '-m', method, '--output', 'json'];
  if (body !== undefined) args.push('-d', JSON.stringify(body));
  return parseJson(nyxid(args));
}

function responseData(response) {
  return response && response.data && response.data.data ? response.data : response;
}

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

function run(input) {
  const serviceSlug = input.serviceSlug || input.configService || input.nyxidServiceSlug;
  if (!serviceSlug) return { needs_more_information: true, missing: ['serviceSlug'] };
  const service = serviceShow(serviceSlug);
  const headers = collectHeaders(service);
  const config = requiredConfig(headers);
  if (config.needs_more_information) return config;
  const payload = buildPayload({
    coreBudgetRecords: fetchRecords(serviceSlug, config.appToken, config.coreBudgetTableId, config.pageSize),
    coreActualRecords: fetchRecords(serviceSlug, config.appToken, config.coreActualTableId, config.pageSize),
    aelfBudgetRecords: fetchRecords(serviceSlug, config.appToken, config.aelfBudgetTableId, config.pageSize),
    aelfActualRecords: fetchRecords(serviceSlug, config.appToken, config.aelfActualTableId, config.pageSize),
    period: input.period || config.period,
    currency: input.currency || config.currency,
    watchThresholdPercent: input.watchThresholdPercent ?? config.watchThresholdPercent,
    alertThresholdPercent: input.alertThresholdPercent ?? config.alertThresholdPercent,
    criticalThresholdPercent: input.criticalThresholdPercent ?? config.criticalThresholdPercent,
    receiveId: input.receiveId || config.receiveId,
    receiveIdType: input.receiveIdType || config.receiveIdType
  });
  if (payload.needs_more_information) return payload;
  let sendResponse = null;
  let sent = false;
  let messageId = null;
  if (payload.lark && payload.lark.body) {
    const sendPath = `/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(input.receiveIdType || config.receiveIdType)}`;
    sendResponse = proxyRequest(serviceSlug, sendPath, 'POST', payload.lark.body);
    const data = responseData(sendResponse).data || {};
    messageId = data.message_id || null;
    sent = true;
  }
  return { serviceSlug, sent, messageId, severity: payload.severity, summary: payload.summary, dataCutoff: payload.dataCutoff, totals: payload.totals, highlights: payload.highlights, sendResponse, payload: sent ? undefined : payload };
}

if (require.main === module) {
  const input = process.argv[2] ? { serviceSlug: process.argv[2] } : parseJson(require('fs').readFileSync(0, 'utf8'));
  process.stdout.write(`${JSON.stringify(run(input), null, 2)}
`);
}

module.exports = { run };
