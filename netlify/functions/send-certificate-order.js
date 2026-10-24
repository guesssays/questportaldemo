// netlify/functions/send-certificate-order.js
// Заказ подарочного сертификата. Уходит в ту же группу, что и брони (TELEGRAM_CHAT_ID).

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
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return json(500, { ok: false, error: 'Missing env: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' });
    }

    const data = JSON.parse(event.body || '{}');

    // honeypot
    if (data.botcheck) return json(200, { ok: true });

    const required = ['name', 'phone'];
    const missing = required.filter(k => !data[k] || String(data[k]).trim() === '');
    if (missing.length) {
      return json(400, { ok: false, error: 'Missing fields: ' + missing.join(', ') });
    }

    const name    = String(data.name).trim().slice(0, 100);
    const phone   = String(data.phone).trim().slice(0, 40);
    const comment = data.comment ? String(data.comment).trim().slice(0, 500) : '';

    // ── форматируем сообщение ──────────────────────────────────
    const lines = [
      `🎟 *${escapeMd('Заказ подарочного сертификата')}*`,
      `*Имя:* ${escapeMd(name)}`,
      `*Телефон:* ${escapeMd(phone)}`
    ];
    if (comment) lines.push(`*Комментарий:* ${escapeMd(comment)}`);
    const text = lines.join('\n');

    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'MarkdownV2' })
    });

    let tg = {};
    try { tg = await resp.json(); } catch { tg = { ok: false, description: 'Bad response from Telegram' }; }
    if (!tg.ok) {
      return json(502, { ok: false, error: tg.description || 'Telegram API error' });
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
}

// минимальный экранировщик под MarkdownV2 Telegram
function escapeMd(s) {
  return String(s).replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!\\])/g, '\\$1');
}
