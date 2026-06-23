import { handleTelegramUpdate } from './commands/handler';

export default {
  async fetch(request: Request, env: Record<string, string>) {
    const url = new URL(request.url);

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

    return new Response('ok');
  },
};
