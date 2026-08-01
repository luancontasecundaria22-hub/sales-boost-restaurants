// Dados DEMO do módulo de Stories do Agente de Conteúdo. Tudo fictício —
// nenhuma API da Meta é chamada. A estrutura já é a que a integração real vai
// preencher: Stories orgânicos (com figurinhas interativas) + Story Ads com
// A/B, métricas simuladas, aprendizado e conexão com o cérebro de marketing.

export type StickerKind = 'poll' | 'question' | 'quiz' | 'countdown' | 'slider' | 'link'
export const STICKER_META: Record<StickerKind, { label: string; icon: string }> = {
  poll: { label: 'Enquete', icon: '📊' },
  question: { label: 'Caixa de pergunta', icon: '❓' },
  quiz: { label: 'Quiz', icon: '🧠' },
  countdown: { label: 'Contagem regressiva', icon: '⏳' },
  slider: { label: 'Slider de emoji', icon: '🎚️' },
  link: { label: 'Link', icon: '🔗' },
}

export type StoryStage = 'topo' | 'meio' | 'fundo'
export const STORY_STAGE_META: Record<StoryStage, { label: string; short: string; color: string; icon: string }> = {
  topo: { label: 'Topo — Atrair', short: 'Topo', color: '#60a5fa', icon: '👀' },
  meio: { label: 'Meio — Nutrir', short: 'Meio', color: '#a78bfa', icon: '🤝' },
  fundo: { label: 'Fundo — Converter', short: 'Fundo', color: '#4ade80', icon: '🎯' },
}

export type StoryStatus = 'rascunho' | 'agendado' | 'publicado'
export const STORY_STATUS_META: Record<StoryStatus, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: '#FBBF24' },
  agendado: { label: 'Agendado', color: '#60a5fa' },
  publicado: { label: 'Publicado', color: '#4ade80' },
}

export interface StorySticker { kind: StickerKind; detail: string }

export interface OrganicStory {
  id: string
  title: string
  format: 'imagem' | 'vídeo'
  stage: StoryStage
  status: StoryStatus
  scheduledFor: string
  mediaPrompt: string
  text: string
  cta: string
  stickers: StorySticker[]
  whyNow: string
}

export interface StoryAdMetrics {
  reach: number; impressions: number; tapsForward: number; tapsBack: number; exits: number
  replies: number; ctr: number; cpc: number; retention: number; conversions: number
  costPerResult: number; spend: number; budget: number
}
export interface StoryAdVariation { angle: string; hook: string; sticker: StickerKind }

export interface StoryAd {
  id: string
  name: string
  status: 'ativa' | 'rascunho'
  objective: string
  audience: string
  format: 'imagem' | 'vídeo'
  hook: string
  primaryText: string
  cta: string
  creativePrompt: string
  interaction: StickerKind
  budget: string
  healthScore: number
  predictedCtr: number
  metrics?: StoryAdMetrics
  variations: StoryAdVariation[]
}

export interface StoryLearning { dimension: string; winner: string; note: string }

export interface StoriesConfig {
  automation: boolean
  publishSchedule: string
  adBudget: string
  optimizationGoal: string
  interactionTypes: StickerKind[]
  learning: boolean
  approval: string
}

export interface StoriesDemo {
  organic: OrganicStory[]
  ads: StoryAd[]
  learnings: StoryLearning[]
  config: StoriesConfig
  overview: { scheduled: number; drafts: number; activeAds: number; predictedCtr: number; avgRetention: number; monthlyBudget: string }
}

export function buildStoriesDemo(company: { business_name?: string; business_type?: string | null; city?: string | null }): StoriesDemo {
  const biz = company.business_name ?? 'seu negócio'
  const local = company.city ?? 'sua região'

  const organic: OrganicStory[] = [
    {
      id: 'st1', title: 'Bastidor do dia + enquete', format: 'vídeo', stage: 'topo', status: 'agendado', scheduledFor: 'Hoje, 12h',
      mediaPrompt: 'Vídeo vertical 9:16 dos bastidores reais do dia a dia, luz natural, pessoa da equipe sorrindo, sem texto na imagem.',
      text: 'Um dia comum aqui na ' + biz + ' 👀 Qual parte você queria ver mais?',
      cta: 'Arrasta pra cima / responde a enquete',
      stickers: [{ kind: 'poll', detail: 'Bastidores 🎬  vs  Resultados ✨' }],
      whyNow: 'Topo de funil: conteúdo leve com enquete aumenta alcance e ensina o algoritmo quem se interessa.',
    },
    {
      id: 'st2', title: 'Caixinha de perguntas', format: 'imagem', stage: 'meio', status: 'rascunho', scheduledFor: 'Amanhã, 19h',
      mediaPrompt: 'Fundo na cor da marca, tipografia grande e limpa, espaço pra figurinha de pergunta no centro.',
      text: 'Pode perguntar o que quiser sobre ' + (company.business_type ?? 'o que fazemos') + ' 👇 A gente responde tudo!',
      cta: 'Manda sua dúvida',
      stickers: [{ kind: 'question', detail: 'Ficou com alguma dúvida?' }],
      whyNow: 'Meio de funil: responder dúvidas gera confiança e dá ideias de conteúdo com base no que o público pergunta.',
    },
    {
      id: 'st3', title: 'Contagem pra oferta', format: 'imagem', stage: 'fundo', status: 'rascunho', scheduledFor: 'Sexta, 10h',
      mediaPrompt: 'Detalhe premium do produto/serviço, tons quentes, figurinha de contagem regressiva no canto.',
      text: 'Últimas vagas da experiência VIP 💛 Ativa o lembrete pra não perder!',
      cta: 'Ativar lembrete',
      stickers: [{ kind: 'countdown', detail: 'Encerra sexta 23h59' }, { kind: 'link', detail: 'Página da oferta' }],
      whyNow: 'Fundo de funil: contagem + link cria urgência real e leva quem já confia direto pra ação.',
    },
    {
      id: 'st4', title: 'Slider de satisfação', format: 'imagem', stage: 'meio', status: 'agendado', scheduledFor: 'Domingo, 18h',
      mediaPrompt: 'Foto real de cliente satisfeito (com autorização), luz suave, espaço pro slider de emoji.',
      text: 'De 0 a 😍, quanto você ama isso aqui?',
      cta: 'Desliza o emoji',
      stickers: [{ kind: 'slider', detail: 'Emoji 😍' }],
      whyNow: 'Interação de baixo atrito: o slider tem uma das maiores taxas de resposta e reaquece a audiência.',
    },
  ]

  const ads: StoryAd[] = [
    {
      id: 'ad1', name: 'Story Ad — Quiz "qual seu perfil?"', status: 'ativa', objective: 'Reconhecimento + captura de interesse',
      audience: `Público frio, interesses do segmento, raio de 8 km de ${local}, 25–45 anos`,
      format: 'vídeo', hook: 'Descubra em 10 segundos qual é o seu perfil',
      primaryText: 'Responde o quiz e a gente te mostra a melhor opção pra você — rapidinho, sem compromisso.',
      cta: 'Fazer o quiz', creativePrompt: 'Vídeo vertical dinâmico, cortes rápidos, texto grande, figurinha de quiz interativa.',
      interaction: 'quiz', budget: 'R$ 300/mês', healthScore: 84, predictedCtr: 0,
      metrics: { reach: 38200, impressions: 52100, tapsForward: 6100, tapsBack: 1800, exits: 2400, replies: 320, ctr: 2.4, cpc: 0.58, retention: 71, conversions: 143, costPerResult: 2.1, spend: 300, budget: 300 },
      variations: [
        { angle: 'Curiosidade', hook: 'Qual é o seu perfil? Descubra agora', sticker: 'quiz' },
        { angle: 'Prova social', hook: 'Milhares já descobriram o deles', sticker: 'poll' },
      ],
    },
    {
      id: 'ad2', name: 'Story Ad — Enquete "A ou B?"', status: 'ativa', objective: 'Engajamento + remarketing',
      audience: 'Remarketing de quem viu o perfil / engajou nos últimos 30 dias',
      format: 'imagem', hook: 'A ou B? Vota aí 👇',
      primaryText: 'A gente quer saber o que você prefere — sua resposta ajuda a gente a te atender melhor.',
      cta: 'Votar agora', creativePrompt: 'Split A/B na vertical, cores da marca, figurinha de enquete centralizada.',
      interaction: 'poll', budget: 'R$ 200/mês', healthScore: 76, predictedCtr: 0,
      metrics: { reach: 14800, impressions: 26300, tapsForward: 2900, tapsBack: 900, exits: 1100, replies: 210, ctr: 3.1, cpc: 0.42, retention: 78, conversions: 88, costPerResult: 1.6, spend: 200, budget: 200 },
      variations: [
        { angle: 'Diversão', hook: 'Escolha impossível: A ou B?', sticker: 'poll' },
      ],
    },
    {
      id: 'ad3', name: 'Story Ad — Convite VIP com contagem', status: 'rascunho', objective: 'Conversão (fundo de funil)',
      audience: 'Quem interagiu com os Stories / quiz e não converteu (últimos 14 dias)',
      format: 'vídeo', hook: 'Seu convite VIP acaba em breve ⏳',
      primaryText: 'Liberamos um bônus exclusivo por tempo limitado pra quem já acompanha a gente. Ativa o lembrete.',
      cta: 'Garantir meu lugar', creativePrompt: 'Detalhe premium, dourado suave, figurinha de contagem regressiva + link.',
      interaction: 'countdown', budget: 'R$ 250/mês', healthScore: 70, predictedCtr: 3.2,
      variations: [
        { angle: 'Escassez', hook: 'Últimas horas do bônus VIP', sticker: 'countdown' },
        { angle: 'Pertencimento', hook: 'Entra pro grupo que já decidiu', sticker: 'link' },
      ],
    },
  ]

  const learnings: StoryLearning[] = [
    { dimension: 'Melhor figurinha', winner: 'Quiz e Enquete', note: '2,4× mais interações que Story sem figurinha.' },
    { dimension: 'Melhor formato', winner: 'Vídeo vertical curto (≤10s)', note: 'Retenção 12pp acima da imagem estática.' },
    { dimension: 'Melhor CTA', winner: '“Fazer o quiz”', note: 'Supera “Saiba mais” no topo de funil.' },
    { dimension: 'Melhor cor de fundo', winner: 'Laranja da marca + alto contraste', note: 'CTR 0,5pp acima de fundos neutros.' },
    { dimension: 'Melhor horário', winner: '19h–21h', note: 'Maior taxa de resposta e menor custo por resultado.' },
    { dimension: 'Etapa mais rentável', winner: 'Remarketing (enquete)', note: 'Menor custo por resultado — público aquecido.' },
  ]

  const config: StoriesConfig = {
    automation: true,
    publishSchedule: '2 Stories/dia · 12h e 19h',
    adBudget: 'R$ 750/mês',
    optimizationGoal: 'Custo por resultado',
    interactionTypes: ['poll', 'question', 'quiz', 'countdown', 'slider'],
    learning: true,
    approval: 'Rascunha sozinho → você aprova',
  }

  const scheduled = organic.filter(s => s.status === 'agendado').length
  const drafts = organic.filter(s => s.status === 'rascunho').length
  const activeAds = ads.filter(a => a.status === 'ativa').length

  return {
    organic, ads, learnings, config,
    overview: { scheduled, drafts, activeAds, predictedCtr: 2.7, avgRetention: 74, monthlyBudget: 'R$ 750' },
  }
}
