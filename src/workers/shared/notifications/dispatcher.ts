import { NotifyPayload } from './types';
import { sendTelegramMessage } from './telegram';

function buildMessage(payload: NotifyPayload): string {
  const { event, data = {} } = payload;

  switch (event) {
    case 'NEW_COMPETITOR':
      return `🧭 Novo concorrente detectado!\n${(data.name as string) ?? 'Novo player no mapa'}\nAcesse /concorrentes para ver a análise completa.`;

    case 'NEW_LEAD':
      return `📥 Novo lead!\n${(data.lead ?? 'Novo lead entrou no funil')}\nNão esqueça de acompanhar.`;

    case 'POST_APPROVED':
      return `✅ Post aprovado!\n${(data.title ?? 'Um novo post foi aprovado e está na fila')}\nAcompanhe em Posts.`;

    case 'NEGATIVE_REVIEW':
      return `⚠️ Nova avaliação negativa!\n⭐ ${(data.rating ?? '?')} | ${(data.source ?? '')}\nMensagem: ${(data.excerpt ?? '')}\nResponda rapidamente para proteger sua reputação.`;

    case 'OPPORTUNITY_DETECTED':
      return `💰 Oportunidade detectada!\n${(data.description ?? 'Uma nova oportunidade de receita foi encontrada')}\nUse /relatorio para mais detalhes.`;

    case 'REPORT_READY':
      return `📊 Relatório mensal disponível!\nAcesse pelo bot com /relatorio ou pelo dashboard.`;

    default:
      return (payload.message as string) ?? 'Nova atualização do Sales Boost.';
  }
}

export async function dispatchNotification(env: {
  TELEGRAM_BOT_TOKEN?: string;
  WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}, payload: NotifyPayload): Promise<{ ok: boolean }> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('missing TELEGRAM_BOT_TOKEN');
    return { ok: false };
  }

  const chatId = Number(payload.chat_id);
  if (!Number.isFinite(chatId)) {
    console.error('invalid chat_id', payload.chat_id);
    return { ok: false };
  }

  const text = buildMessage(payload);
  return sendTelegramMessage(token, chatId, text);
}
