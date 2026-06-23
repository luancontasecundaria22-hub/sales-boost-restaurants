import { TelegramUpdate } from '../../../../shared/types';

const TELEGRAM_API = 'https://api.telegram.org';
const BOT_NAME = 'marketing';

async function sendMessage(env: Record<string, string>, chatId: number, text: string) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error: ${res.status} ${body}`);
  }
  return res.json();
}

async function logEvent(env: Record<string, string>, chatId: number, eventType: string, message: string) {
  const logUrl = env.LOG_EVENT_URL;
  if (!logUrl) return;
  try {
    await fetch(logUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: env.BOT_WEBHOOK_SECRET ?? '',
        bot_name: BOT_NAME,
        event_type: eventType,
        message,
        telegram_chat_id: chatId,
      }),
    });
  } catch { /* logging never blocks the bot */ }
}

async function handleStart(chatId: number, _text: string, env: Record<string, string>) {
  const greeting =
    'Olá! Eu sou o SalesBoostContentBot.\n\n' +
    'Comandos disponíveis:\n' +
    '/diagnostico — diagnóstico do site\n' +
    '/concorrentes — análise de concorrentes\n' +
    '/relatorio — relatório mensal\n\n' +
    'Em breve: análise de avaliações e alertas automáticos.';

  await sendMessage(env, chatId, greeting);
  await logEvent(env, chatId, 'start', '👋 Novo usuário iniciou o bot de marketing');
}

async function handleDiagnostico(chatId: number, _text: string, env: Record<string, string>) {
  const edgeUrl = env.DIAGNOSTIC_EDGE_URL;
  if (!edgeUrl) {
    await sendMessage(env, chatId, 'Serviço de diagnóstico não configurado.');
    return;
  }

  await sendMessage(env, chatId, '🔍 Gerando diagnóstico do seu site... isso pode levar até 1 minuto.');
  await logEvent(env, chatId, 'diagnostico', '🔍 Diagnóstico de site solicitado via Telegram');

  try {
    const res = await fetch(edgeUrl, { method: 'POST' });
    const data = await res.json();
    const score = data.score ?? data.performance ?? 'N/A';
    const reply = `✅ Diagnóstico concluído!\nScore: ${score}\n\nVeja os detalhes completos no dashboard.`;
    await sendMessage(env, chatId, reply);
    await logEvent(env, chatId, 'diagnostico_ok', `✅ Diagnóstico concluído — Score: ${score}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido';
    await sendMessage(env, chatId, `❌ Falha ao gerar diagnóstico: ${message}`);
    await logEvent(env, chatId, 'diagnostico_erro', `❌ Erro no diagnóstico: ${message}`);
  }
}

async function handleConcorrentes(chatId: number, _text: string, env: Record<string, string>) {
  const edgeUrl = env.COMPETITORS_EDGE_URL;
  if (!edgeUrl) {
    await sendMessage(env, chatId, 'Consulta de concorrentes não configurada.');
    return;
  }

  await logEvent(env, chatId, 'concorrentes', '🗺 Mapeamento de concorrentes solicitado via Telegram');

  try {
    const res = await fetch(edgeUrl);
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [data];
    const lines = rows.slice(0, 5).map((item: { name?: string; rating?: number }, idx: number) =>
      `${idx + 1}. ${item.name ?? '—'} | ⭐ ${item.rating ?? '—'}`
    );
    const reply = lines.length
      ? `🗺 Top concorrentes:\n${lines.join('\n')}\n\nVeja análise completa no dashboard.`
      : '🗺 Nenhum concorrente encontrado.';
    await sendMessage(env, chatId, reply);
    await logEvent(env, chatId, 'concorrentes_ok', `🗺 ${rows.length} concorrente(s) mapeado(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido';
    await sendMessage(env, chatId, `❌ Falha ao buscar concorrentes: ${message}`);
    await logEvent(env, chatId, 'concorrentes_erro', `❌ Erro ao mapear concorrentes: ${message}`);
  }
}

async function handleRelatorio(chatId: number, _text: string, env: Record<string, string>) {
  const edgeUrl = env.REPORT_EDGE_URL;
  if (!edgeUrl) {
    await sendMessage(env, chatId, 'Relatório não configurado.');
    return;
  }

  await sendMessage(env, chatId, '📊 Gerando relatório mensal...');
  await logEvent(env, chatId, 'relatorio', '📊 Relatório mensal solicitado via Telegram');

  try {
    const res = await fetch(edgeUrl, { method: 'POST' });
    const data = await res.json();
    const reply = data.pdf_url
      ? `📊 Relatório gerado!\nBaixe aqui: ${data.pdf_url}`
      : '📊 Relatório gerado! Veja no dashboard.';
    await sendMessage(env, chatId, reply);
    await logEvent(env, chatId, 'relatorio_ok', '📊 Relatório mensal gerado com sucesso');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido';
    await sendMessage(env, chatId, `❌ Falha ao gerar relatório: ${message}`);
    await logEvent(env, chatId, 'relatorio_erro', `❌ Erro no relatório: ${message}`);
  }
}

const COMMANDS = new Map<string, (chatId: number, text: string, env: Record<string, string>) => Promise<void>>([
  ['/start', handleStart],
  ['/diagnostico', handleDiagnostico],
  ['/diagnostico_site', handleDiagnostico],
  ['/concorrentes', handleConcorrentes],
  ['/relatorio', handleRelatorio],
  ['report', handleRelatorio],
]);

export async function handleTelegramUpdate(update: TelegramUpdate, env: Record<string, string>) {
  const message = update.message ?? update.edited_message;
  if (!message || !message.text) return { ok: true };

  const chatId = message.chat.id;
  const text = message.text.trim();
  const [command, ...rest] = text.split(/\s+/);
  const args = rest.join(' ');

  const handler = COMMANDS.get(command.toLowerCase());
  if (!handler) {
    await sendMessage(env, chatId, 'Comando não reconhecido. Use /start para ver os comandos disponíveis.');
    return { ok: true };
  }

  await handler(chatId, args, env);
  return { ok: true };
}
