// netlify/functions/send-print-order.js
// Заказ футболки с выбранным принтом. Уходит в отдельную Telegram-группу (печать принтов):
// TELEGRAM_PRINTS_CHAT_ID. Пока группа не настроена — в общий чат TELEGRAM_CHAT_ID.

export async function handler(event) {
  const origin = event.headers.origin || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
  const json = (statusCode, body) => ({
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_PRINTS_CHAT_ID, TELEGRAM_CHAT_ID } = process.env;
    const chatId = TELEGRAM_PRINTS_CHAT_ID || TELEGRAM_CHAT_ID;
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      return json(500, { ok: false, error: 'Missing env: TELEGRAM_BOT_TOKEN or TELEGRAM_PRINTS_CHAT_ID' });
    }

    const data = JSON.parse(event.body || '{}');

    // honeypot
    if (data.botcheck) return json(200, { ok: true });

    const required = ['name', 'phone', 'date', 'print'];
    const missing = required.filter(k => !data[k] || String(data[k]).trim() === '');
    if (missing.length) {
      return json(400, { ok: false, error: 'Missing fields: ' + missing.join(', ') });
    }

    const printNum = parseInt(data.print, 10);
    if (!Number.isInteger(printNum) || printNum < 1 || printNum > 99) {
      return json(400, { ok: false, error: 'Invalid print number' });
    }

    const name    = String(data.name).trim().slice(0, 100);
    const phone   = String(data.phone).trim().slice(0, 40);
    const date    = String(data.date).trim();
    const comment = data.comment ? String(data.comment).trim().slice(0, 500) : '';

    // картинка принта — чтобы в группе сразу было видно, какой именно
    const siteUrl  = (process.env.URL || 'https://www.questportal.uz').replace(/\/+$/, '');
    const photoUrl = `${siteUrl}/images/prints/print-${String(printNum).padStart(2, '0')}.jpg`;

    // ── форматируем сообщение ──────────────────────────────────
    const lines = [
      `👕 *${escapeMd('Заказ футболки с принтом')}*`,
      `*Принт:* №${printNum}`,
      `*Имя:* ${escapeMd(name)}`,
      `*Телефон:* ${escapeMd(phone)}`,
      `*Нужна к дате:* ${escapeMd(formatDate(date))}`
    ];
    if (comment) lines.push(`*Комментарий:* ${escapeMd(comment)}`);
    lines.push('', escapeMd('Варёнка, оверсайз · изготовление минимум за сутки'));
    const text = lines.join('\n');

    // сначала — фото принта с подписью; если Telegram не смог забрать картинку, шлём текстом со ссылкой
    let tg = await tgCall(TELEGRAM_BOT_TOKEN, 'sendPhoto', {
      chat_id: chatId, photo: photoUrl, caption: text, parse_mode: 'MarkdownV2'
    });
    if (!tg.ok) {
      tg = await tgCall(TELEGRAM_BOT_TOKEN, 'sendMessage', {
        chat_id: chatId, text: `${text}\n${escapeMd(photoUrl)}`, parse_mode: 'MarkdownV2'
      });
    }
    if (!tg.ok) {
      return json(502, { ok: false, error: tg.description || 'Telegram API error' });
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
}

async function tgCall(token, method, body) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  try {
    return await resp.json();
  } catch {
    return { ok: false, description: 'Bad response from Telegram' };
  }
}

// 2026-09-20 → 20.09.2026
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

// минимальный экранировщик под MarkdownV2 Telegram
function escapeMd(s) {
  return String(s).replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!\\])/g, '\\$1');
}
