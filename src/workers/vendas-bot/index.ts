import { handleTelegramUpdate } from './commands/handler';
import { dispatchNotification } from '../../shared/notifications/dispatcher';
import { NotifyPayload } from '../../shared/notifications/types';

export default {
  async fetch(request: Request, env: Record<string, string>) {
    const url = new URL(request.url);

    // Webhook do Telegram
    if (request.method === 'POST' && url.pathname.startsWith('/webhook')) {
      try {
        const update = (await request.json()) as Parameters<typeof handleTelegramUpdate>[0];
        const response = await handleTelegramUpdate(update, env);
        return new Response(JSON.stringify(response), {
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    // Notificações internas da plataforma -> Telegram
    if (request.method === 'POST' && url.pathname === '/notify') {
      try {
        const secret = request.headers.get('x-webhook-secret') ?? '';
        if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }

        const payload = (await request.json()) as NotifyPayload;
        await dispatchNotification(env, payload);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    return new Response('ok');
  },
};
