// ── Dados demo do Feedback Loop (Fase 4) ─────────────────────────────────
// O diferencial do produto: fechar o ciclo anúncio → lead → venda →
// aprendizado, CRUZANDO os dados dos outros módulos. Aqui reaproveitamos os
// criativos do Meta Ads e o funil pra a cadeia de atribuição ser coerente com
// o que aparece nas outras abas — não números soltos.
import type { CompanyData } from '../../../contexts/CompanyContext'
import { seededRng, fmtBRL, fmtNum, buildMetaAdsDemo } from './growthDemo'

export interface AttributionStep { key: string; label: string; value: string; icon: string }

export type Confidence = 'high' | 'medium' | 'low'
export const CONFIDENCE_META: Record<Confidence, { label: string; color: string }> = {
  high: { label: 'Alta confiança', color: '#4ade80' },
  medium: { label: 'Média confiança', color: '#FBBF24' },
  low: { label: 'Explorando', color: '#60a5fa' },
}

export interface Learning {
  id: string; title: string; evidence: string; confidence: Confidence; action: string
}

export interface FeedbackDemo {
  chain: AttributionStep[]
  learnings: Learning[]
  topCreative: { name: string; roas: number }
  worstCreative: { name: string; roas: number }
  multiplier: string
}

export function buildFeedbackDemo(company: Pick<CompanyData, 'id' | 'business_name'>): FeedbackDemo {
  const rng = seededRng((company.id || company.business_name || 'demo') + ':feedback')
  const between = (min: number, max: number) => min + rng() * (max - min)

  const ads = buildMetaAdsDemo(company)
  const spend = ads.totals.spend
  const revenue = ads.totals.revenue
  const clicks = Math.round(spend / Math.max(ads.totals.cpc, 0.1))
  const leads = Math.max(ads.totals.conversions, Math.round(clicks * between(0.08, 0.16)))
  const conversas = Math.round(leads * between(0.5, 0.75))
  const vendas = ads.totals.conversions

  const chain: AttributionStep[] = [
    { key: 'invest', label: 'Investido', value: fmtBRL(spend, true), icon: '💰' },
    { key: 'clicks', label: 'Cliques', value: fmtNum(clicks), icon: '👆' },
    { key: 'leads', label: 'Leads', value: fmtNum(leads), icon: '🧲' },
    { key: 'conversas', label: 'Conversas', value: fmtNum(conversas), icon: '💬' },
    { key: 'vendas', label: 'Vendas', value: fmtNum(vendas), icon: '✅' },
    { key: 'receita', label: 'Receita', value: fmtBRL(revenue, true), icon: '💵' },
  ]

  const sorted = [...ads.creatives].sort((a, b) => b.roas - a.roas)
  const topCreative = { name: sorted[0].name, roas: sorted[0].roas }
  const worstCreative = { name: sorted[sorted.length - 1].name, roas: sorted[sorted.length - 1].roas }
  const multiplier = (topCreative.roas / Math.max(worstCreative.roas, 0.1)).toFixed(1)

  const learnings: Learning[] = [
    {
      id: 'l_creative', confidence: 'high',
      title: `Vídeo de depoimento converte ${multiplier}x mais que imagem`,
      evidence: `"${topCreative.name}" teve ROAS de ${topCreative.roas}x contra ${worstCreative.roas}x de "${worstCreative.name}". A prova social é o que mais fecha venda no seu segmento.`,
      action: 'Priorizamos esse formato: 3 novas variações criadas e a imagem de pior desempenho pausada.',
    },
    {
      id: 'l_speed', confidence: 'high',
      title: 'Leads respondidos em menos de 1h fecham 3x mais',
      evidence: 'Cruzando o funil com o atendimento: leads sem resposta em 24h praticamente não convertem. O gargalo não era o anúncio, era a velocidade do atendimento.',
      action: 'O agente de WhatsApp passou a responder na hora e a rascunhar o follow-up dos leads parados.',
    },
    {
      id: 'l_audience', confidence: 'medium',
      title: 'Público 25-34 tem o menor custo por venda',
      evidence: `Esse público concentra a maior parte das conversões com o menor CPA. Escalar verba nele melhora o ROAS geral.`,
      action: 'Redistribuímos o orçamento das campanhas para priorizar essa faixa.',
    },
    {
      id: 'l_remarketing', confidence: 'medium',
      title: 'Remarketing é o melhor ROAS do funil',
      evidence: 'Quem já visitou o site e é impactado de novo compra muito mais barato do que público novo — é a verba mais eficiente que você tem.',
      action: 'Montamos uma campanha de remarketing como rascunho, aguardando sua aprovação.',
    },
  ]

  return { chain, learnings, topCreative, worstCreative, multiplier }
}
