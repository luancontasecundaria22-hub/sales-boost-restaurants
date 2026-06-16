import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const CARD = '#1A1008'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.07)'
const D = "'Bricolage Grotesque', system-ui, sans-serif"

interface PagespeedResult {
  scores: { performance: number; seo: number; accessibility: number; best_practices: number }
  metrics: { lcp?: string; tbt?: string; cls?: string; fcp?: string; si?: string }
  opportunities: Array<{ id: string; value?: string }>
}

interface Diagnostic {
  id: string
  business_name: string
  business_type: string
  city: string
  website_url: string
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  google_maps_url: string | null
  goal: string
  pagespeed_mobile: PagespeedResult | null
  pagespeed_desktop: PagespeedResult | null
  apify_run_ids: Record<string, string>
  status: string
  created_at: string
}

function scoreColor(score: number): string {
  if (score >= 90) return '#4ade80'
  if (score >= 75) return '#86efac'
  if (score >= 50) return '#FBBF24'
  return '#f87171'
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Ótimo'
  if (score >= 75) return 'Bom'
  if (score >= 50) return 'Atenção'
  return 'Crítico'
}

function ScoreCard({ label, score, desc }: { label: string; score: number; desc?: string }) {
  const color = scoreColor(score)
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 0%, ${color}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: D, color, lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.02em' }}>{score}</div>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: MUTED, marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '99px', background: `${color}15`, color, border: `1px solid ${color}30` }}>{scoreLabel(score)}</div>
      {desc && <div style={{ fontSize: '11px', color: MUTED, marginTop: '8px', lineHeight: 1.5 }}>{desc}</div>}
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: '13px', color: MUTED }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{value}</span>
    </div>
  )
}

function SectionCard({ title, icon, children, accent }: { title: string; icon: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '20px', overflow: 'hidden', marginBottom: '24px' }}>
      <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${accent ?? ORANGE}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{icon}</div>
        <span style={{ fontFamily: D, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{title}</span>
      </div>
      <div style={{ padding: '24px 28px' }}>{children}</div>
    </div>
  )
}

function OverallScore({ mobile, desktop }: { mobile: PagespeedResult | null; desktop: PagespeedResult | null }) {
  const ps = mobile ?? desktop
  if (!ps) return null
  const avg = Math.round(Object.values(ps.scores).reduce((a, b) => a + b, 0) / 4)
  const color = scoreColor(avg)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 28px', background: `${color}08`, borderBottom: `1px solid ${color}20` }}>
      <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - avg / 100)}`}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D, fontSize: '18px', fontWeight: 900, color }}>{avg}</div>
      </div>
      <div>
        <div style={{ fontFamily: D, fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Score geral do site</div>
        <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>
          Média entre performance, SEO, acessibilidade e boas práticas.{' '}
          <span style={{ color: scoreColor(avg), fontWeight: 600 }}>{scoreLabel(avg)}</span>.
        </div>
      </div>
    </div>
  )
}

const METRIC_LABELS: Record<string, string> = {
  lcp: 'Maior elemento visível (LCP)',
  fcp: 'Primeira pintura de conteúdo (FCP)',
  si: 'Índice de velocidade (SI)',
  tbt: 'Tempo de bloqueio total (TBT)',
  cls: 'Mudança de layout acumulada (CLS)',
}

const OPPORTUNITY_LABELS: Record<string, string> = {
  'render-blocking-resources': 'Recursos bloqueando renderização',
  'unused-css-rules': 'CSS não utilizado',
  'unused-javascript': 'JavaScript não utilizado',
  'uses-optimized-images': 'Imagens não otimizadas',
  'uses-webp-images': 'Imagens sem formato moderno (WebP)',
  'uses-responsive-images': 'Imagens sem tamanho responsivo',
  'efficient-animated-content': 'Animações pesadas',
  'uses-text-compression': 'Compressão de texto ausente',
  'time-to-first-byte': 'Tempo até o primeiro byte (TTFB) lento',
  'redirects': 'Redirecionamentos desnecessários',
  'meta-description': 'Meta description ausente',
  'document-title': 'Título da página ausente',
  'link-text': 'Links sem texto descritivo',
  'image-alt': 'Imagens sem texto alternativo',
  'color-contrast': 'Contraste de cores insuficiente',
}

export default function DiagnosticoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [diag, setDiag] = useState<Diagnostic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile')

  useEffect(() => {
    if (!id) return
    supabase
      .from('diagnostics')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('Diagnóstico não encontrado.')
        else setDiag(data as Diagnostic)
        setLoading(false)
      })
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: `3px solid rgba(255,109,41,0.15)`, borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !diag) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>😕</div>
      <div style={{ color: 'white', fontSize: '18px', fontWeight: 700 }}>Diagnóstico não encontrado</div>
      <Link to="/onboarding" style={{ color: ORANGE, textDecoration: 'none', fontSize: '14px' }}>← Criar novo diagnóstico</Link>
    </div>
  )

  const ps = strategy === 'mobile' ? diag.pagespeed_mobile : diag.pagespeed_desktop
  const hasPagespeed = !!(diag.pagespeed_mobile || diag.pagespeed_desktop)
  const hasSocial = !!(diag.instagram_url || diag.facebook_url || diag.tiktok_url || diag.google_maps_url)

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: D, fontSize: '1.3rem', fontWeight: 900, color: 'white', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          <span style={{ color: ORANGE }}>Sales</span>Boost
        </a>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: MUTED }}>Diagnóstico de</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{diag.business_name}</span>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Hero */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '99px', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.2)', fontSize: '12px', fontWeight: 700, color: ORANGE, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Diagnóstico Gratuito
          </div>
          <h1 style={{ fontFamily: D, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '8px', lineHeight: 1.1 }}>
            {diag.business_name}
          </h1>
          <p style={{ fontSize: '15px', color: MUTED, lineHeight: 1.6 }}>
            {diag.business_type} · {diag.city} · {diag.website_url}
          </p>
        </div>

        {/* ── BLOCO 1: Frontend / LP ── */}
        {hasPagespeed && (
          <SectionCard title="Performance do site" icon="⚡" accent={ORANGE}>
            <OverallScore mobile={diag.pagespeed_mobile} desktop={diag.pagespeed_desktop} />

            {/* Strategy toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', marginTop: '24px' }}>
              {(['mobile', 'desktop'] as const).map(s => (
                <button key={s} onClick={() => setStrategy(s)} style={{
                  padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                  background: strategy === s ? ORANGE : 'rgba(255,255,255,0.05)',
                  color: strategy === s ? '#000' : MUTED, border: 'none', cursor: 'pointer',
                  textTransform: 'capitalize', transition: 'all 0.2s',
                }}>{s === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}</button>
              ))}
            </div>

            {ps ? (
              <>
                {/* Scores grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '28px' }}>
                  <ScoreCard label="Performance" score={ps.scores.performance} desc="Velocidade de carregamento" />
                  <ScoreCard label="SEO" score={ps.scores.seo} desc="Visibilidade no Google" />
                  <ScoreCard label="Acessibilidade" score={ps.scores.accessibility} desc="Experiência para todos" />
                  <ScoreCard label="Boas práticas" score={ps.scores.best_practices} desc="Padrões modernos" />
                </div>

                {/* Core Web Vitals */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Core Web Vitals</div>
                  <MetricRow label={METRIC_LABELS.lcp} value={ps.metrics.lcp} />
                  <MetricRow label={METRIC_LABELS.fcp} value={ps.metrics.fcp} />
                  <MetricRow label={METRIC_LABELS.si} value={ps.metrics.si} />
                  <MetricRow label={METRIC_LABELS.tbt} value={ps.metrics.tbt} />
                  <MetricRow label={METRIC_LABELS.cls} value={ps.metrics.cls} />
                </div>

                {/* Opportunities */}
                {ps.opportunities.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Principais oportunidades de melhoria</div>
                    {ps.opportunities.map((o, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: MUTED, flex: 1 }}>{OPPORTUNITY_LABELS[o.id] ?? o.id}</span>
                        {o.value && <span style={{ fontSize: '12px', color: '#FBBF24', fontWeight: 600 }}>{o.value}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: MUTED, fontSize: '14px' }}>
                Dados de {strategy === 'mobile' ? 'mobile' : 'desktop'} não disponíveis.
              </div>
            )}
          </SectionCard>
        )}

        {!hasPagespeed && (
          <SectionCard title="Performance do site" icon="⚡" accent={ORANGE}>
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <div style={{ color: 'white', fontWeight: 600, marginBottom: '8px' }}>Análise em andamento</div>
              <div style={{ color: MUTED, fontSize: '13px' }}>A análise de performance pode demorar alguns minutos.</div>
            </div>
          </SectionCard>
        )}

        {/* ── BLOCO 2: Presença digital ── */}
        <SectionCard title="Presença digital mapeada" icon="🌐" accent="#4ade80">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Site', value: diag.website_url, icon: '🌐' },
              { label: 'Instagram', value: diag.instagram_url, icon: '📸' },
              { label: 'Facebook', value: diag.facebook_url, icon: '👥' },
              { label: 'TikTok', value: diag.tiktok_url, icon: '🎵' },
              { label: 'Google Maps', value: diag.google_maps_url, icon: '📍' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                padding: '14px 16px', borderRadius: '12px',
                background: value ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${value ? 'rgba(74,222,128,0.2)' : BORDER}`,
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '18px' }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: '12px', color: value ? '#4ade80' : 'rgba(255,255,255,0.2)', fontWeight: 600, marginTop: '2px' }}>
                    {value ? 'Conectado' : 'Não informado'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(diag.apify_run_ids ?? {}).length > 0 ? (
            <div style={{ padding: '12px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '10px', fontSize: '13px', color: '#86efac' }}>
              ✓ Varredura Apify iniciada — dados de reviews e engajamento serão incorporados ao relatório completo.
            </div>
          ) : hasSocial ? (
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', fontSize: '13px', color: MUTED }}>
              Configure o Apify Token para ativar a varredura de reviews e redes sociais.
            </div>
          ) : null}
        </SectionCard>

        {/* ── BLOCO 3: Próximos passos ── */}
        <SectionCard title="O que fazemos com isso" icon="🚀" accent="#a78bfa">
          <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
            {[
              { num: '01', title: 'Relatório completo personalizado', desc: 'Cruzamos todos os dados para identificar exatamente onde você perde vendas.' },
              { num: '02', title: 'Plano de ação com 3 prioridades', desc: 'Ações concretas e priorizadas por impacto — não dashboards genéricos.' },
              { num: '03', title: 'Posts semanais automáticos', desc: 'A IA gera conteúdo para suas redes sociais usando o perfil do seu negócio.' },
            ].map(({ num, title, desc }) => (
              <div key={num} style={{ display: 'flex', gap: '14px', padding: '16px', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#a78bfa', flexShrink: 0 }}>{num}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{title}</div>
                  <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA — create account to save + access dashboard */}
          <button
            onClick={() => navigate(`/signup?claim=${diag.id}`)}
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: '15px 28px', background: ORANGE, color: '#000', fontFamily: D, fontWeight: 900, fontSize: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 12px 32px rgba(255,109,41,0.35)' }}
          >
            Criar conta gratuita e salvar diagnóstico →
          </button>
          <p style={{ textAlign: 'center', fontSize: '12px', color: MUTED, marginTop: '12px' }}>
            Acesse o painel completo com histórico de diagnósticos, Search Console e mais.
          </p>

          <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: '24px', paddingTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: MUTED, marginBottom: '12px' }}>Prefere falar com a gente?</p>
            <a
              href={`mailto:luan26ribeiro@gmail.com?subject=Diagnóstico SalesBoost — ${diag.business_name}&body=Olá! Vi meu diagnóstico (ID: ${diag.id}) e quero saber mais.`}
              style={{ display: 'inline-block', padding: '10px 24px', background: 'rgba(255,255,255,0.06)', color: 'white', fontWeight: 600, fontSize: '14px', borderRadius: '10px', textDecoration: 'none', border: `1px solid ${BORDER}` }}
            >
              Agendar conversa gratuita
            </a>
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
