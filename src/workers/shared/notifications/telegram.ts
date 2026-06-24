const TELEGRAM_API = 'https://api.telegram.org';

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...extra }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Telegram sendMessage failed', res.status, body);
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.error('Telegram sendMessage error', error);
    return { ok: false };
  }
}
