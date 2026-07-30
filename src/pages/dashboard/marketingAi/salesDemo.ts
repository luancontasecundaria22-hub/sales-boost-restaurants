// ── Dados demo do Funil de Vendas + Atendimento WhatsApp (Fase 3) ────────
// Mesma lógica demo-first das fases anteriores: números estáveis por empresa,
// mesma FORMA que o CRM real (tabela leads/lead_messages) e a WhatsApp
// Business API vão preencher quando as integrações entrarem ao vivo.
import type { CompanyData } from '../../../contexts/CompanyContext'
import { seededRng } from './growthDemo'

// ── Funil ────────────────────────────────────────────────────────────────
export type LeadTemp = 'quente' | 'morno' | 'frio'
export type LeadStageKey = 'novo' | 'contato' | 'qualificado' | 'proposta' | 'venda'

export interface DemoLead {
  id: string; name: string; channel: string; stageKey: LeadStageKey
  temperature: LeadTemp; value: number; lastContact: string; note: string; noReply: boolean
}

export const STAGE_ORDER: { key: LeadStageKey; label: string }[] = [
  { key: 'novo', label: 'Novo Lead' },
  { key: 'contato', label: 'Contato realizado' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'venda', label: 'Venda realizada' },
]

export const TEMP_META: Record<LeadTemp, { label: string; color: string }> = {
  quente: { label: 'Quente', color: '#f87171' },
  morno: { label: 'Morno', color: '#FBBF24' },
  frio: { label: 'Frio', color: '#60a5fa' },
}

const NAMES = ['Ana Costa', 'Bruno Lima', 'Carla Souza', 'Diego Alves', 'Fernanda Rocha', 'Gustavo Dias', 'Helena Martins', 'Igor Nunes', 'Juliana Prado', 'Lucas Ferreira', 'Marina Gomes', 'Rafael Pinto', 'Sofia Ribeiro', 'Thiago Melo', 'Vanessa Cruz', 'Paulo Henrique', 'Beatriz Nogueira', 'Rodrigo Teixeira']
const CHANNELS = ['WhatsApp', 'Instagram', 'Anúncio Meta', 'Site']
const NOTES: Record<LeadStageKey, string[]> = {
  novo: ['Clicou no anúncio e mandou "oi"', 'Comentou "quero saber o preço"', 'Preencheu o formulário do site'],
  contato: ['Respondeu, pediu mais informações', 'Perguntou sobre horários', 'Demonstrou interesse, sem urgência'],
  qualificado: ['Pediu orçamento — alto interesse', 'Encaixa no perfil, tem budget', 'Já comprou de concorrente, aberto a trocar'],
  proposta: ['Proposta enviada, avaliando', 'Pediu desconto, negociando', 'Aguardando decisão do sócio'],
  venda: ['Fechou! Pagamento confirmado', 'Comprou o plano principal', 'Cliente novo, primeiro pedido'],
}
const STAGE_COUNTS: Record<LeadStageKey, [number, number]> = {
  novo: [4, 6], contato: [3, 5], qualificado: [2, 4], proposta: [1, 3], venda: [1, 3],
}
const STAGE_TEMP: Record<LeadStageKey, LeadTemp[]> = {
  novo: ['frio', 'frio', 'morno'], contato: ['frio', 'morno', 'morno'],
  qualificado: ['morno', 'quente', 'quente'], proposta: ['quente', 'quente', 'morno'], venda: ['quente', 'quente', 'quente'],
}
const LAST_CONTACT = ['há 20min', 'há 2h', 'há 5h', 'há 1 dia', 'há 2 dias', 'há 3 dias']

export interface FunnelDemo { leads: DemoLead[]; pipelineValue: number; noReplyCount: number }

export function buildFunnelDemo(company: Pick<CompanyData, 'id' | 'business_name'>): FunnelDemo {
  const rng = seededRng((company.id || company.business_name || 'demo') + ':funil')
  const iBetween = (min: number, max: number) => Math.round(min + rng() * (max - min))
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]

  const leads: DemoLead[] = []
  let n = 0
  for (const { key } of STAGE_ORDER) {
    const [lo, hi] = STAGE_COUNTS[key]
    const count = iBetween(lo, hi)
    for (let i = 0; i < count; i++) {
      const early = key === 'novo' || key === 'contato'
      const noReply = early && rng() < 0.4
      leads.push({
        id: `lead_${n}`,
        name: NAMES[n % NAMES.length],
        channel: pick(CHANNELS),
        stageKey: key,
        temperature: pick(STAGE_TEMP[key]),
        value: iBetween(2, 30) * 100,
        lastContact: pick(LAST_CONTACT),
        note: pick(NOTES[key]),
        noReply,
      })
      n++
    }
  }

  const pipelineValue = leads.filter(l => l.stageKey !== 'venda').reduce((s, l) => s + l.value, 0)
  const noReplyCount = leads.filter(l => l.noReply).length
  return { leads, pipelineValue, noReplyCount }
}

// ── Atendimento WhatsApp ─────────────────────────────────────────────────
export type WaStatus = 'ia_respondendo' | 'qualificado' | 'aguardando_humano' | 'agendado'

export const WA_STATUS_META: Record<WaStatus, { label: string; color: string }> = {
  ia_respondendo: { label: 'IA respondendo', color: '#4ade80' },
  qualificado: { label: 'Qualificado', color: '#FF6D29' },
  aguardando_humano: { label: 'Aguardando humano', color: '#FBBF24' },
  agendado: { label: 'Reunião agendada', color: '#60a5fa' },
}

export interface DemoWaMessage { from: 'cliente' | 'agente'; text: string; time: string }
export interface DemoWaConversation {
  id: string; name: string; status: WaStatus; unread: number; lastPreview: string; messages: DemoWaMessage[]
}

// Fila de follow-up: clientes que esfriaram e o agente rascunhou uma mensagem
// pra reaquecer — sempre esperando aprovação (nunca envia sozinho).
export interface FollowUpItem {
  id: string; name: string; channel: string; lastContact: string
  reason: string; draft: string; temperature: LeadTemp
}

export type AutonomyLevel = 'suggest' | 'approve' | 'auto'
export const AUTONOMY_META: Record<AutonomyLevel, { label: string; hint: string }> = {
  suggest: { label: 'Só sugerir', hint: 'A IA escreve, você copia e envia.' },
  approve: { label: 'Aprovar antes', hint: 'A IA rascunha e envia após seu ok.' },
  auto: { label: 'Responder sozinho', hint: 'A IA responde na hora; te chama só no que for sensível.' },
}

export interface WhatsAppDemo {
  conversations: DemoWaConversation[]
  knowledge: { faq: string[]; products: string[] }
  followUps: FollowUpItem[]
  handoff: { autonomy: AutonomyLevel; activeFrom: string; activeTo: string }
}

export function buildWhatsAppDemo(company: Pick<CompanyData, 'id' | 'business_name' | 'business_type'>): WhatsAppDemo {
  const biz = company.business_name || 'sua empresa'
  const type = company.business_type || 'negócio'

  const conversations: DemoWaConversation[] = [
    {
      id: 'wa_1', name: 'Ana Costa', status: 'qualificado', unread: 0,
      lastPreview: 'Perfeito, pode me mandar o orçamento?',
      messages: [
        { from: 'cliente', text: 'Oi, vi o anúncio de vocês. Como funciona?', time: '09:12' },
        { from: 'agente', text: `Oi, Ana! Que bom te ver por aqui 😊 Somos a ${biz}. Me conta rapidinho o que você está procurando pra eu já te indicar a melhor opção?`, time: '09:12' },
        { from: 'cliente', text: 'Quero algo pra esse fim de semana', time: '09:14' },
        { from: 'agente', text: 'Temos disponibilidade sim! O valor fica a partir de R$ 250. Quer que eu já reserve pra você?', time: '09:14' },
        { from: 'cliente', text: 'Perfeito, pode me mandar o orçamento?', time: '09:15' },
      ],
    },
    {
      id: 'wa_2', name: 'Bruno Lima', status: 'ia_respondendo', unread: 2,
      lastPreview: 'E vocês atendem na zona sul?',
      messages: [
        { from: 'cliente', text: 'Bom dia! Vocês têm plano mensal?', time: '10:01' },
        { from: 'agente', text: 'Bom dia, Bruno! Temos sim. O plano mensal sai por R$ 197 e inclui tudo do pacote básico. Quer os detalhes?', time: '10:01' },
        { from: 'cliente', text: 'E vocês atendem na zona sul?', time: '10:03' },
      ],
    },
    {
      id: 'wa_3', name: 'Carla Souza', status: 'aguardando_humano', unread: 1,
      lastPreview: 'Preciso de uma condição especial pra 3 unidades',
      messages: [
        { from: 'cliente', text: 'Oi, queria fechar pra minha empresa inteira', time: '11:20' },
        { from: 'agente', text: 'Que ótimo, Carla! Pra pedidos maiores eu vou chamar alguém do time pra fazer uma condição sob medida pra você. Só um instante 🙌', time: '11:20' },
        { from: 'cliente', text: 'Preciso de uma condição especial pra 3 unidades', time: '11:21' },
      ],
    },
    {
      id: 'wa_4', name: 'Diego Alves', status: 'agendado', unread: 0,
      lastPreview: 'Combinado, quinta às 15h!',
      messages: [
        { from: 'cliente', text: 'Consigo uma demonstração?', time: '14:40' },
        { from: 'agente', text: 'Claro! Tenho horário quinta às 15h ou sexta às 10h. Qual fica melhor pra você?', time: '14:41' },
        { from: 'cliente', text: 'Quinta às 15h', time: '14:42' },
        { from: 'agente', text: 'Combinado, quinta às 15h! Já bloqueei na agenda e avisei o time. Até lá 👋', time: '14:42' },
      ],
    },
  ]

  const knowledge = {
    faq: ['Horário de funcionamento', 'Formas de pagamento', 'Área de atendimento / entrega', 'Política de cancelamento', 'Prazos'],
    products: [`Pacote básico da ${biz}`, 'Plano mensal (R$ 197)', 'Plano Pro', `Serviços avulsos de ${type}`],
  }

  const followUps: FollowUpItem[] = [
    { id: 'fu_1', name: 'Gustavo Dias', channel: 'WhatsApp', lastContact: 'há 2 dias', temperature: 'quente', reason: 'Pediu orçamento e não respondeu depois do valor.', draft: `Oi, Gustavo! Passando pra saber se ficou alguma dúvida sobre o orçamento 😊 Se quiser, consigo segurar a condição até amanhã. Quer que eu reserve?` },
    { id: 'fu_2', name: 'Helena Martins', channel: 'Instagram', lastContact: 'há 3 dias', temperature: 'morno', reason: 'Demonstrou interesse mas sumiu antes de agendar.', draft: `Oi, Helena! Vi que você tinha interesse em conhecer a ${biz}. Tenho um horário essa semana — quer que eu te mostre como funciona, sem compromisso?` },
    { id: 'fu_3', name: 'Rafael Pinto', channel: 'WhatsApp', lastContact: 'há 5 dias', temperature: 'morno', reason: 'Conversou, pediu pra pensar e não voltou.', draft: `Oi, Rafael! Tudo certo? Fiquei à disposição pra qualquer dúvida sobre o que conversamos. Posso te ajudar a decidir?` },
    { id: 'fu_4', name: 'Beatriz Nogueira', channel: 'Anúncio Meta', lastContact: 'há 6 dias', temperature: 'frio', reason: 'Clicou no anúncio, mandou "oi" e não seguiu.', draft: `Oi, Beatriz! Você chegou até a gente pelo anúncio 🙌 Ainda dá tempo de aproveitar. Quer que eu te explique rapidinho como funciona?` },
  ]

  return {
    conversations, knowledge, followUps,
    handoff: { autonomy: 'approve', activeFrom: '08:00', activeTo: '20:00' },
  }
}
