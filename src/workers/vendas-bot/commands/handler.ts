import { TelegramUpdate } from '../../../../shared/types';

const TELEGRAM_API = 'https://api.telegram.org';
const BOT_NAME = 'vendas';

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
    'Olá! Eu sou o bot de Vendas do Sales Boost.\n\n' +
    'Posso te ajudar a conhecer melhor a plataforma e apresentar cases de sucesso.\n\n' +
    'Comandos disponíveis:\n' +
    '/inicio — apresentação\n' +
    '/cases — cases de sucesso\n' +
    '/preco — planos e valores\n' +
    '/agendar — solicitar uma demonstração';

  await sendMessage(env, chatId, greeting);
  await logEvent(env, chatId, 'start', '🎯 Novo lead iniciou o bot de vendas');
}

async function handleCases(chatId: number, _text: string, env: Record<string, string>) {
  await sendMessage(
    env,
    chatId,
    'Cases rápidos:\n' +
      '• Restaurante X: +38% de receita em 30 dias\n' +
      '• Restaurante Y: 2.4x mais ações de clientes\n' +
      '• Restaurante Z: redução de reviews negativas em 60%\n\n' +
      'Caso queira uma demonstração personalizada, use /agendar.',
  );
  await logEvent(env, chatId, 'cases', '📈 Lead pediu cases de sucesso');
}

async function handlePreco(chatId: number, _text: string, env: Record<string, string>) {
  await sendMessage(
    env,
    chatId,
    'Planos:\n' +
      '• Básico: R$ 497/mês — até 500 mensagens/mês e relatórios básicos\n' +
      '• Pro: R$ 997/mês — relatórios avançados + integrações\n' +
      '• Enterprise: sob consulta\n\n' +
      'Use /agendar para uma demonstração personalizada.',
  );
  await logEvent(env, chatId, 'preco', '💰 Lead consultou preços');
}

async function handleAgendar(chatId: number, _text: string, env: Record<string, string>) {
  await sendMessage(
    env,
    chatId,
    'Perfeito! Para agendar uma demonstração, informe:\n' +
      '1) Nome do responsável\n' +
      '2) Nome do restaurante\n' +
      '3) Cidade/UF\n' +
      '4) Melhor horário\n\n' +
      'Exemplo:\nJoão, Burguer House, São Paulo/SP, terça às 14h.',
  );
  await logEvent(env, chatId, 'agendar', '📅 Lead solicitou demonstração — aguardando dados');
}

const COMMANDS = new Map<string, (chatId: number, text: string, env: Record<string, string>) => Promise<void>>([
  ['/start', handleStart],
  ['/inicio', handleStart],
  ['/cases', handleCases],
  ['/preco', handlePreco],
  ['/agendar', handleAgendar],
  ['demo', handleAgendar],
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
    // Log unknown messages as potential leads
    await logEvent(env, chatId, 'mensagem_livre', `💬 Lead enviou mensagem: "${text.slice(0, 80)}"`);
    await sendMessage(env, chatId, 'Não entendi esse comando. Use /inicio para ver opções.');
    return { ok: true };
  }

  await handler(chatId, args, env);
  return { ok: true };
}
