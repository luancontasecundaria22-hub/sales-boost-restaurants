/**
 * run-agents — compatibilidade com o gatilho existente na VPS Hermes.
 *
 * Isto costumava ser um agente autônomo próprio (3 tarefas fixas: sempre
 * criar 5 posts, sempre checar oportunidades, sempre checar reviews) — o que
 * causou o bug de posts duplicados: rodava sem saber se já havia rascunhos
 * suficientes, e podia disparar em rajada.
 *
 * Agora é só uma ponte: mantém exatamente o mesmo endereço e a mesma
 * autenticação (x-webhook-secret) que a VPS já chama, mas por baixo delega
 * para o `hermes-proxy` em modo cron — o orquestrador de verdade, que olha o
 * negócio inteiro e decide se Marketing e/ou Vendas precisam agir. Isso
 * significa que o gatilho existente na VPS não precisa mudar nada para
 * ganhar o comportamento novo.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const secret = req.headers.get('x-webhook-secret')
    const envSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
    if (!envSecret || secret !== envSecret) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret) return json({ error: 'CRON_SECRET nao configurado nos secrets do Supabase.' }, 500)

    const res = await fetch(`${supabaseUrl}/functions/v1/hermes-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cron_secret: cronSecret }),
    })
    const data = await res.json().catch(() => ({}))
    return json({ delegated_to: 'hermes-proxy', ...data }, res.status)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
