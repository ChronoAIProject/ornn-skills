#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readInput() {
  const text = fs.readFileSync(0, 'utf8');
  return text.trim() ? JSON.parse(text) : {};
}

function extractRecords(rawRecords) {
  return (rawRecords || []).map((item) => (item && item.fields ? item.fields : item));
}

function firstValue(record, names) {
  for (const name of names) {
    const value = record ? record[name] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function parseAmount(value) {
  if (typeof value === 'number') return value;
  if (value === undefined || value === null || value === '') return 0;
  const text = String(value).replace(/[,\s"]/g, '');
  if (text.startsWith('(') && text.endsWith(')')) return -(parseFloat(text.slice(1, -1)) || 0);
  return parseFloat(text) || 0;
}

function normalizeDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) return text.replace(/\//g, '-');
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }
  return text;
}

function normalizeRows(rawRecords) {
  return extractRecords(rawRecords).map((record) => ({
    date: normalizeDate(firstValue(record, ['日期', 'date', 'Date', 'period', 'month'])),
    category: String(firstValue(record, ['一级类目', 'category', 'Category', 'project', 'Project', 'department', 'team']) || 'Unknown'),
    businessUnit: String(firstValue(record, ['BU', 'bu', 'businessUnit', 'business_unit', 'team', 'department']) || 'Unknown'),
    amount: parseAmount(firstValue(record, ['支出金额(USD)', 'amount', 'Amount', 'budget', 'planned', 'actual', 'spent', 'cost']))
  }));
}

function maxDate(rows) {
  const dates = rows.map((row) => row.date || '').filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : '';
}

function filterToCutoff(rows, cutoff) {
  if (!cutoff) return rows;
  return rows.filter((row) => !row.date || row.date <= cutoff);
}

function aggregate(rows, keyName) {
  const result = {};
  for (const row of rows) {
    const key = row[keyName] || 'Unknown';
    result[key] = (result[key] || 0) + row.amount;
  }
  return result;
}

function round2(value) { return Math.round(value * 100) / 100; }

function computeVariance(plannedByGroup, actualByGroup, thresholds) {
  const keys = Object.keys(plannedByGroup);
  for (const key of Object.keys(actualByGroup)) if (!keys.includes(key)) keys.push(key);
  return keys.map((key) => {
    const planned = plannedByGroup[key] || 0;
    const actual = actualByGroup[key] || 0;
    const usagePercent = planned > 0 ? round2((actual / planned) * 100) : (actual > 0 ? -1 : 0);
    const variance = round2(actual - planned);
    const variancePercent = planned > 0 ? round2((variance / planned) * 100) : (actual > 0 ? -1 : 0);
    let level = 'ok';
    if (usagePercent === -1 || usagePercent >= thresholds.critical) level = 'critical';
    else if (usagePercent >= thresholds.warning) level = 'warning';
    else if (usagePercent >= thresholds.watch) level = 'watch';
    return { group: key, planned: round2(planned), actual: round2(actual), variance, usagePercent, variancePercent, level };
  }).sort((a, b) => {
    const ap = a.usagePercent === -1 ? 999999 : a.usagePercent;
    const bp = b.usagePercent === -1 ? 999999 : b.usagePercent;
    return bp - ap;
  });
}

function sum(rows) { return round2(rows.reduce((total, row) => total + row.amount, 0)); }
function formatMoney(value, currency) { const rounded = Math.round(Math.abs(value)).toLocaleString('en-US'); return currency === 'USD' ? `$${rounded}` : `${currency} ${rounded}`; }
function formatPercent(value) { return value === -1 ? 'N/A' : `${value}%`; }

function buildSection(title, variance, totalBudget, totalActual, currency) {
  const totalPct = totalBudget > 0 ? round2((totalActual / totalBudget) * 100) : 0;
  const lines = [`**${title}**  Total: ${formatMoney(totalActual, currency)} / ${formatMoney(totalBudget, currency)} (${totalPct}%)`, ''];
  for (const [level, label] of [['critical', 'Critical'], ['warning', 'Warning'], ['watch', 'Watch']]) {
    const items = variance.filter((item) => item.level === level);
    if (!items.length) continue;
    lines.push(`**${label}**`);
    for (const item of items) lines.push(`- ${item.group}: ${formatMoney(item.actual, currency)} / ${formatMoney(item.planned, currency)} (${formatPercent(item.usagePercent)})`);
    lines.push('');
  }
  const okCount = variance.filter((item) => item.level === 'ok').length;
  if (okCount > 0) lines.push(`Normal groups: ${okCount}`);
  return lines.join('\n');
}

function buildPayload(input) {
  const required = ['coreBudgetRecords', 'coreActualRecords', 'aelfBudgetRecords', 'aelfActualRecords'];
  const missing = required.filter((key) => !Array.isArray(input[key]));
  if (missing.length) return { needs_more_information: true, missing };
  const currency = input.currency || 'USD';
  const thresholds = { watch: input.watchThresholdPercent ?? 80, warning: input.alertThresholdPercent ?? 100, critical: input.criticalThresholdPercent ?? 120 };
  const coreBudgetAll = normalizeRows(input.coreBudgetRecords);
  const coreActual = normalizeRows(input.coreActualRecords);
  const aelfBudgetAll = normalizeRows(input.aelfBudgetRecords);
  const aelfActual = normalizeRows(input.aelfActualRecords);
  const coreCutoff = maxDate(coreActual);
  const aelfCutoff = maxDate(aelfActual);
  const dataCutoff = [coreCutoff, aelfCutoff].filter(Boolean).sort().pop() || '';
  const coreBudget = filterToCutoff(coreBudgetAll, coreCutoff);
  const aelfBudget = filterToCutoff(aelfBudgetAll, aelfCutoff);
  const coreVariance = computeVariance(aggregate(coreBudget, 'category'), aggregate(coreActual, 'category'), thresholds);
  const aelfVariance = computeVariance(aggregate(aelfBudget, 'category'), aggregate(aelfActual, 'category'), thresholds);
  const coreByBusinessUnit = computeVariance(aggregate(coreBudget, 'businessUnit'), aggregate(coreActual, 'businessUnit'), thresholds);
  const coreTotalBudget = sum(coreBudget), coreTotalActual = sum(coreActual), aelfTotalBudget = sum(aelfBudget), aelfTotalActual = sum(aelfActual);
  const totalPlanned = round2(coreTotalBudget + aelfTotalBudget), totalActual = round2(coreTotalActual + aelfTotalActual);
  const totalVariance = round2(totalActual - totalPlanned);
  const totalUsagePercent = totalPlanned > 0 ? round2((totalActual / totalPlanned) * 100) : 0;
  const totalVariancePercent = totalPlanned > 0 ? round2((totalVariance / totalPlanned) * 100) : 0;
  const highlights = [['core', coreVariance], ['aelf', aelfVariance], ['coreByBusinessUnit', coreByBusinessUnit]].flatMap(([scope, items]) => items.filter((item) => ['critical', 'warning', 'watch'].includes(item.level)).map((item) => ({ ...item, scope, reason: item.usagePercent === -1 ? 'Actual spend exists without planned budget' : `${item.usagePercent}% usage` })));
  const hasCritical = highlights.some((item) => item.level === 'critical');
  const hasWarning = highlights.some((item) => item.level === 'warning' || item.level === 'watch');
  const severity = hasCritical ? 'critical' : (hasWarning ? 'warning' : 'info');
  const template = severity === 'critical' ? 'red' : (severity === 'warning' ? 'orange' : 'green');
  const period = input.period || (dataCutoff ? `through ${dataCutoff}` : 'current-period');
  const card = { config: { wide_screen_mode: true }, header: { title: { tag: 'plain_text', content: `Budget variance summary ${period}` }, template }, elements: [ { tag: 'div', text: { tag: 'lark_md', content: `Data cutoff: ${dataCutoff || 'N/A'}` } }, { tag: 'hr' }, { tag: 'div', text: { tag: 'lark_md', content: buildSection('Core budget', coreVariance, coreTotalBudget, coreTotalActual, currency) } }, { tag: 'hr' }, { tag: 'div', text: { tag: 'lark_md', content: buildSection('aelf budget', aelfVariance, aelfTotalBudget, aelfTotalActual, currency) } }, { tag: 'hr' }, { tag: 'div', text: { tag: 'lark_md', content: buildSection('Core by business unit', coreByBusinessUnit, coreTotalBudget, coreTotalActual, currency) } } ] };
  const lark = { msg_type: 'interactive', card };
  if (input.receiveId) lark.body = { receive_id: input.receiveId, msg_type: 'interactive', content: JSON.stringify(card) };
  return { message_type: 'interactive', summary: `Budget variance summary for ${period}`, severity, period, currency, dataCutoff, thresholds: { watchPercent: thresholds.watch, warningPercent: thresholds.warning, criticalPercent: thresholds.critical }, totals: { planned: totalPlanned, actual: totalActual, variance: totalVariance, usagePercent: totalUsagePercent, variancePercent: totalVariancePercent }, sections: { core: { totalBudget: coreTotalBudget, totalActual: coreTotalActual, variance: coreVariance }, aelf: { totalBudget: aelfTotalBudget, totalActual: aelfTotalActual, variance: aelfVariance }, coreByBusinessUnit }, highlights, lark };
}

if (require.main === module) process.stdout.write(`${JSON.stringify(buildPayload(readInput()), null, 2)}\n`);
module.exports = { buildPayload };
