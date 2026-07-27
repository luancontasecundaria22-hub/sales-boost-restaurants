// ── Camada de dados DEMO do Growth OS ────────────────────────────────────
// Enquanto a Meta (e as outras integrações) não estão verificadas/ligadas de
// verdade, o Growth Command Center e as Conexões precisam mostrar o produto
// funcionando de ponta a ponta — como uma demonstração. Este módulo gera
// números realistas e ESTÁVEIS por empresa (mesma empresa → sempre os mesmos
// números), a partir de um seed derivado do id da empresa.
//
// IMPORTANTE (arquitetura demo-first): a FORMA dos dados aqui é a mesma que a
// Meta API vai preencher no futuro. Quando a conta for verificada, a gente só
// troca a FONTE (demo → Meta live) — as telas não mudam. Nada aqui grava no
// banco; é só apresentação.

import { useCallback, useState } from 'react'
import type { CompanyData } from '../../../contexts/CompanyContext'

// ── PRNG determinístico (xmur3 + mulberry32) ─────────────────────────────
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function seededRng(key: string): () => number {
  return mulberry32(xmur3(key)())
}

// ── Tipos ────────────────────────────────────────────────────────────────
export interface GrowthKpis {
  revenue: number; revenueDelta: number
  leads: number; leadsDelta: number
  funnelConversion: number; funnelConversionDelta: number
  roas: number; roasDelta: number
  adSpend: number
  igFollowers: number; igFollowersGained: number
  contentEngagement: number; contentEngagementDelta: number
}

export type ConnectionCategory = 'meta' | 'mensageria' | 'reputacao' | 'site' | 'crm' | 'ecommerce'

export interface DemoConnection {
  key: string
  name: string
  category: ConnectionCategory
  icon: string
  connected: boolean
  detail: string
  requiresVerification?: boolean
}

export interface DemoFunnelStage { key: string; label: string; count: number; value: number }

export interface DemoAgentStatus {
  key: string; name: string; icon: string
  state: 'active' | 'idle' | 'soon'
  lastAction: string
}

export type CommandInsightKind = 'oportunidade' | 'problema' | 'acao_recomendada' | 'acao_executada'

export interface CommandInsight {
  id: string
  kind: CommandInsightKind
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

export interface GrowthDemoData {
  kpis: GrowthKpis
  connections: DemoConnection[]
  funnel: DemoFunnelStage[]
  agents: DemoAgentStatus[]
  insights: CommandInsight[]
}

const CONNECTION_CATEGORY_LABEL: Record<ConnectionCategory, string> = {
  meta: 'Meta Business', mensageria: 'Mensageria', reputacao: 'Reputação',
  site: 'Site', crm: 'CRM', ecommerce: 'E-commerce',
}
export { CONNECTION_CATEGORY_LABEL }

// ── Gerador principal ────────────────────────────────────────────────────
export function buildGrowthDemo(company: Pick<CompanyData, 'id' | 'business_name' | 'instagram_user_id' | 'website_url' | 'google_place_id'>): GrowthDemoData {
  const rng = seededRng(company.id || company.business_name || 'demo')
  const between = (min: number, max: number) => min + rng() * (max - min)
  const iBetween = (min: number, max: number) => Math.round(between(min, max))

  const adSpend = iBetween(1500, 8000)
  const roas = Number(between(2.6, 6.2).toFixed(1))
  const revenue = Math.round(adSpend * roas + between(8000, 45000))
  const leads = iBetween(90, 420)
  const funnelConversion = Number(between(6, 18).toFixed(1))
  const igFollowers = iBetween(1200, 26000)
  const igFollowersGained = Math.round(igFollowers * between(0.03, 0.09))
  const contentEngagement = Number(between(2.1, 6.8).toFixed(1))

  const kpis: GrowthKpis = {
    revenue, revenueDelta: Number(between(-8, 34).toFixed(1)),
    leads, leadsDelta: Number(between(-12, 41).toFixed(1)),
    funnelConversion, funnelConversionDelta: Number(between(-4, 9).toFixed(1)),
    roas, roasDelta: Number(between(-1.1, 1.8).toFixed(1)),
    adSpend,
    igFollowers, igFollowersGained,
    contentEngagement, contentEngagementDelta: Number(between(-1.4, 2.6).toFixed(1)),
  }

  // Conexões — reflete o estado real quando dá pra saber; o resto é demo,
  // com a Meta Ads honestamente marcada como aguardando verificação.
  const connections: DemoConnection[] = [
    { key: 'instagram', name: 'Instagram Business', category: 'meta', icon: '📸', connected: !!company.instagram_user_id, detail: company.instagram_user_id ? 'Conta conectada' : 'Conectar via Meta Business' },
    { key: 'facebook', name: 'Facebook Page', category: 'meta', icon: '👍', connected: !!company.instagram_user_id, detail: company.instagram_user_id ? 'Página vinculada' : 'Conectar via Meta Business' },
    { key: 'meta_ads', name: 'Meta Ads Manager', category: 'meta', icon: '🎯', connected: false, detail: 'Aguardando verificação da Meta', requiresVerification: true },
    { key: 'whatsapp', name: 'WhatsApp Business API', category: 'mensageria', icon: '💬', connected: false, detail: 'Aguardando verificação da Meta', requiresVerification: true },
    { key: 'gbp', name: 'Google Business Profile', category: 'reputacao', icon: '🗺️', connected: !!company.google_place_id, detail: company.google_place_id ? 'Perfil vinculado' : 'Conectar para reviews e Maps' },
    { key: 'website', name: 'Website', category: 'site', icon: '🌐', connected: !!company.website_url, detail: company.website_url ? String(company.website_url) : 'Adicione a URL do site' },
    { key: 'crm', name: 'CRM', category: 'crm', icon: '🗂️', connected: false, detail: 'Pipeline nativo do Sales Boost (em breve)' },
    { key: 'shopify', name: 'Shopify / E-commerce', category: 'ecommerce', icon: '🛒', connected: false, detail: 'Conectar loja para atribuir receita' },
  ]

  // Funil — contagens decrescentes coerentes com leads e conversão.
  const sales = Math.max(1, Math.round(leads * (funnelConversion / 100)))
  const proposals = Math.round(sales * between(1.8, 2.6))
  const qualified = Math.round(proposals * between(1.7, 2.4))
  const contacted = Math.round(qualified * between(1.3, 1.8))
  const ticket = Math.round(revenue / Math.max(sales, 1))
  const funnel: DemoFunnelStage[] = [
    { key: 'novo', label: 'Novo Lead', count: leads, value: 0 },
    { key: 'contato', label: 'Contato realizado', count: contacted, value: 0 },
    { key: 'qualificado', label: 'Qualificado', count: qualified, value: qualified * ticket },
    { key: 'proposta', label: 'Proposta', count: proposals, value: proposals * ticket },
    { key: 'venda', label: 'Venda realizada', count: sales, value: sales * ticket },
  ]

  const agents: DemoAgentStatus[] = [
    { key: 'market', name: 'Inteligência de Mercado', icon: '🧭', state: 'active', lastAction: 'Mapeou 3 movimentos de concorrentes' },
    { key: 'content', name: 'Conteúdo', icon: '✍️', state: 'active', lastAction: `Criou ${iBetween(4, 10)} ideias de posts` },
    { key: 'ads', name: 'Meta Ads', icon: '🎯', state: 'soon', lastAction: 'Aguardando verificação da Meta' },
    { key: 'sales', name: 'Vendas (Funil)', icon: '🔀', state: 'idle', lastAction: `${iBetween(2, 9)} leads aguardando follow-up` },
    { key: 'whatsapp', name: 'Atendimento WhatsApp', icon: '💬', state: 'soon', lastAction: 'Aguardando verificação da Meta' },
  ]

  const cpl = Math.round(adSpend / Math.max(leads, 1))
  const cplRise = iBetween(18, 32)
  const insights: CommandInsight[] = [
    { id: 'op1', kind: 'oportunidade', title: 'Vídeos de prova social estão performando', description: `Reels com depoimento tiveram ${iBetween(2, 4)}x mais alcance que imagens nos últimos 30 dias. A maior oportunidade é aumentar o investimento nesse formato.`, impact: 'high' },
    { id: 'op2', kind: 'oportunidade', title: `Público 25-34 tem o menor custo por lead`, description: `Esse público converte a R$ ${Math.round(cpl * 0.7)} por lead, ${iBetween(20, 40)}% abaixo da média. Vale concentrar verba nele.`, impact: 'medium' },
    { id: 'pr1', kind: 'problema', title: `Custo por lead subiu ${cplRise}%`, description: `Identificamos que o criativo principal perdeu eficiência (fadiga de anúncio). Recomendamos novas variações.`, impact: 'high' },
    { id: 'pr2', kind: 'problema', title: `${iBetween(120, 300)} leads ficaram sem resposta`, description: 'O gargalo não é o anúncio, é o atendimento. Leads sem resposta em 24h têm 3x menos chance de fechar.', impact: 'high' },
    { id: 'ar1', kind: 'acao_recomendada', title: 'Criar campanha de remarketing', description: 'Impactar de novo quem visitou o site mas não comprou — costuma ter o melhor ROAS do funil.', impact: 'medium' },
    { id: 'ae1', kind: 'acao_executada', title: `Criamos ${iBetween(3, 6)} novas variações de criativo`, description: 'Baseadas no formato de depoimento que está performando melhor. Aguardando sua aprovação para publicar.', impact: 'medium' },
    { id: 'ae2', kind: 'acao_executada', title: `Rascunhamos follow-up para ${iBetween(4, 12)} leads parados`, description: 'Mensagens prontas na aba Funil, esperando sua aprovação antes de enviar.', impact: 'low' },
  ]

  return { kpis, connections, funnel, agents, insights }
}

// ── Modo demo por empresa (localStorage) ─────────────────────────────────
// Fase 1 usa localStorage pra não depender de migration no banco. Quando a
// Meta live entrar (fase 5), isso vira uma coluna real por empresa e o mesmo
// toggle passa a alternar entre "demo" e "dados reais da Meta".
function demoKey(companyId: string | undefined): string {
  return `sb_growth_demo_${companyId ?? 'anon'}`
}

export function useDemoMode(companyId: string | undefined): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true
    const stored = localStorage.getItem(demoKey(companyId))
    return stored == null ? true : stored === '1' // default: ligado (mostra o demo de cara)
  })
  const set = useCallback((v: boolean) => {
    setOn(v)
    try { localStorage.setItem(demoKey(companyId), v ? '1' : '0') } catch { /* ignore */ }
  }, [companyId])
  return [on, set]
}

// ── Formatadores pt-BR ───────────────────────────────────────────────────
export function fmtBRL(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1000) {
    return `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  }
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}
export function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}
export function fmtDelta(n: number): { text: string; positive: boolean } {
  const positive = n >= 0
  return { text: `${positive ? '+' : ''}${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, positive }
}
