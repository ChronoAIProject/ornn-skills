#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readInput() {
  const text = fs.readFileSync(0, 'utf8');
  return text.trim() ? JSON.parse(text) : {};
}

function eventBody(input) {
  return input && input.body && typeof input.body === 'object' ? input.body : input;
}

function parseMessageText(message) {
  const raw = message && message.content !== undefined ? String(message.content) : '';
  try {
    const parsed = JSON.parse(raw || '{}');
    return String(parsed.text || '').trim();
  } catch (_) {
    return raw.trim();
  }
}

function parseCommand(input) {
  const body = eventBody(input || {});
  if (body.challenge) return { skip: true, is_challenge: true, challenge: body.challenge };
  const eventType = (body.header && body.header.event_type) || (body.event && body.event.type) || '';
  if (!String(eventType).includes('message')) return { skip: true, reason: 'not a message event' };
  const event = body.event || {};
  const message = event.message || {};
  const text = parseMessageText(message);
  if (!text.startsWith('/team-health')) return { skip: true, reason: 'not a team-health command' };
  const parts = text.split(/\s+/).filter(Boolean);
  const targetUser = parts[1] || null;
  const aliases = { shining: 'chronoai-shining' };
  const resolvedUser = targetUser ? (aliases[targetUser] || targetUser) : null;
  const chatId = message.chat_id || (event.sender && event.sender.sender_id && event.sender.sender_id.chat_id) || '';
  const userId = (event.sender && event.sender.sender_id && event.sender.sender_id.user_id) || '';
  if (!chatId) return { needs_more_information: true, missing: ['chat_id'] };
  return {
    skip: false,
    chat_id: chatId,
    user_id: userId,
    target_user: resolvedUser,
    display_user: targetUser,
    is_single: Boolean(resolvedUser)
  };
}

function textMessage(chatId, text) {
  return {
    receive_id: chatId,
    msg_type: 'text',
    content: JSON.stringify({ text })
  };
}

function buildMessages(input) {
  const parsed = input.parsed || input;
  const chatId = parsed.chat_id || input.chat_id;
  if (!chatId) return { needs_more_information: true, missing: ['chat_id'] };
  const progressText = parsed.is_single
    ? `⏳ 正在分析 ${parsed.display_user} 的状态，约30秒...`
    : '⏳ 正在分析全团队状态，约2分钟...';
  const result = {
    lark: {
      path: '/open-apis/im/v1/messages?receive_id_type=chat_id',
      progressBody: textMessage(chatId, progressText)
    }
  };
  if (input.report) result.lark.reportBody = textMessage(chatId, String(input.report));
  return result;
}

function buildPayload(input) {
  const mode = input.mode || 'parse_command';
  if (mode === 'build_messages') return buildMessages(input);
  const parsed = parseCommand(input);
  if (parsed.skip || parsed.needs_more_information) return parsed;
  return { ...parsed, ...buildMessages(parsed) };
}

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(buildPayload(readInput()), null, 2)}\n`);
}

module.exports = { buildPayload };
