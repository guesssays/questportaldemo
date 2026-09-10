// netlify/functions/send-telegram.js
// Node 18+ (в Netlify по умолчанию есть fetch). Если нужно — можно импортнуть из 'undici'.

export async function handler(event) {
  // CORS (разрешаем POST с твоего сайта)
  const origin = event.headers.origin || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: 'Missing env: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' })
      };
    }

    const data = JSON.parse(event.body || '{}');

    // honeypot (добавим в форме поле botcheck)
    if (data.botcheck) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    }

    // простая серверная валидация
    const required = ['name', 'phone', 'date', 'time', 'quest', 'players'];
    const missing = required.filter(k => !data[k] || String(data[k]).trim() === '');
    if (missing.length) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: 'Missing fields: ' + missing.join(', ') })
      };
    }

    const name    = String(data.name).trim();
    const phone   = String(data.phone).trim();
    const date    = String(data.date).trim();
    const time    = String(data.time).trim();
    const quest   = String(data.quest).trim();
    const players = String(data.players).trim();
    const comment = (data.comment ? String(data.comment).trim() : '');

    // праздничный набор: все поля addon_* приходят только когда отмечены
    const addons = Object.keys(data)
      .filter(k => k.startsWith('addon_') && data[k])
      .map(k => String(data[k]).trim())
      .filter(Boolean);
    const addonsTotal = data.addons_total ? String(data.addons_total).trim() : '';
    const grandTotal  = data.total ? String(data.total).trim() : '';

    const money = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n.toLocaleString('ru-RU') + ' сум' : v;
    };

// ── форматируем сообщение ──────────────────────────────────
const title = escapeMd('Новая заявка (сайт)'); // экранируем скобки
const text = [
  `🎯 *${title}*`,
  `*Имя:* ${escapeMd(name)}`,
  `*Телефон:* ${escapeMd(phone)}`,
  `*Квест:* ${escapeMd(quest)}`,
  `*Дата/время:* ${escapeMd(date)} ${escapeMd(time)}`,
  `*Игроки:* ${escapeMd(players)}`,
  addons.length
    ? `\n🎉 *Праздничный набор:*\n${addons.map(a => '• ' + escapeMd(a)).join('\n')}` +
      (addonsTotal ? `\n*Набор итого:* ${escapeMd(money(addonsTotal))}` : '') +
      `\n⚠️ ${escapeMd('Торт и подарки — только при 100% оплате')}`
    : '',
  grandTotal ? `\n💰 *ИТОГО:* ${escapeMd(money(grandTotal))}` : '',
  comment ? `\n*Комментарий:* ${escapeMd(comment)}` : ''
].filter(Boolean).join('\n');

const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const resp = await fetch(tgUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'MarkdownV2' })
});
const tg = await resp.json();
if (!tg.ok) {
  return {
    statusCode: 502,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok:false, error: tg.description || 'Telegram API error' }) // ← покажем причину
  };
}


    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};

// минимальный экранировщик под Markdown Telegram
function escapeMd(s) {
  return s.replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!\\])/g, '\\$1'); // + подчистка для V2
}