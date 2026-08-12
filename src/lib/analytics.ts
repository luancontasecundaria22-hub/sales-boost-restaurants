// Analytics do cliente — duas pernas que trabalham juntas:
//  1) PostHog (produto): funis e gráficos agregados, identificados por empresa.
//  2) client_activity (nosso banco): o "diário do cliente" que aparece na ficha
//     da empresa no painel do owner — rápido, sem depender de serviço externo.
//
// `track()` alimenta as duas de uma vez. Sem VITE_POSTHOG_KEY o PostHog fica
// desligado de forma graciosa (nada quebra) e o diário no banco continua.
import posthog from 'posthog-js'
import { supabase } from './supabase'

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com'

export const posthogEnabled = !!KEY

if (KEY) {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // só eventos que a gente marca de propósito — nada de ruído
    capture_exceptions: true,
    persistence: 'localStorage+cookie',
  })
}

// Empresa/usuário atuais — setados no login (identifyCompany), usados por track()
// pra carimbar cada evento sem precisar passar company_id em todo lugar.
let current: { companyId: string; userId: string | null } | null = null

interface IdentifiableCompany {
  id: string
  business_name?: string | null
  plan?: string | null
  business_type?: string | null
  city?: string | null
}

// Chamado quando a empresa do cliente carrega. Amarra os eventos ao usuário e
// à empresa (grupo) no PostHog e guarda o contexto pro diário no banco.
export function identifyCompany(company: IdentifiableCompany, userId: string | null) {
  current = { companyId: company.id, userId: userId ?? null }
  if (KEY) {
    if (userId) {
      posthog.identify(userId, {
        company_id: company.id,
        business_name: company.business_name ?? undefined,
        plan: company.plan ?? undefined,
      })
    }
    posthog.group('company', company.id, {
      name: company.business_name ?? undefined,
      plan: company.plan ?? undefined,
      business_type: company.business_type ?? undefined,
      city: company.city ?? undefined,
    })
  }
}

// Logout: zera o contexto e a sessão do PostHog.
export function resetAnalytics() {
  current = null
  if (KEY) posthog.reset()
}

// Registra uma ação do cliente. `event` é a chave curta (ex: 'post_approved'),
// `label` é o texto amigável que aparece na ficha, `meta` é contexto opcional.
export function track(event: string, label?: string, meta?: Record<string, unknown>) {
  if (KEY) {
    posthog.capture(event, { label, company_id: current?.companyId, ...meta })
  }
  // Diário no nosso banco — só quando sabemos de qual empresa é (cliente logado).
  // RLS deixa o cliente inserir só na própria empresa. Fire-and-forget: nunca
  // deixa uma falha de tracking atrapalhar a ação real do usuário.
  if (current) {
    void supabase.from('client_activity').insert({
      company_id: current.companyId,
      user_id: current.userId,
      event,
      label: label ?? null,
      meta: meta ?? null,
    }).then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn('[analytics] client_activity insert falhou:', error.message)
    })
  }
}
