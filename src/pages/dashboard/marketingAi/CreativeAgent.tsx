import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { track } from '../../../lib/analytics'
import { CARD, MUTED, BORDER, D, SUPABASE_URL } from './shared'

const ORANGE = '#FF6D29'
const MOD_LABEL: Record<string, string> = { organico: 'Orgânico', stories: 'Stories', campanhas: 'Campanhas' }

interface Idea { id: string; title: string; hook: string | null; angle: string | null; format: string | null; module: string | null; rationale: string | null; status: string; created_at: string }

// Creative Agent — traz IDEIAS de post em cards. Cada ideia pode virar um post
// de teste (creative-generate com a ideia como semente), que cai na Área de
// Testes do módulo. Nada publica sozinho.
export default function CreativeAgent({ companyId }: { companyId: string }) {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_ideas').select('*').eq('company_id', companyId).neq('status', 'dismissed').order('created_at', { ascending: false }).limit(30)
    setIdeas((data ?? []) as Idea[])
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  const generateIdeas = async () => {
    setGenerating(true); setErr(''); setMsg('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/creative-ideas`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error ?? 'Erro ao gerar ideias')
      track('ideas_generated', 'Gerou ideias de post')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao gerar ideias')
    }
    setGenerating(false)
  }

  const generatePost = async (idea: Idea) => {
    setBusyId(idea.id); setErr(''); setMsg('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/creative-generate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: idea.module ?? 'organico', idea_id: idea.id, idea: { title: idea.title, hook: idea.hook, angle: idea.angle, format: idea.format } }),
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error ?? 'Erro ao gerar post')
      track('content_generated', `Gerou post de uma ideia (${MOD_LABEL[idea.module ?? 'organico'] ?? idea.module})`, { from_idea: idea.id })
      setMsg(`Post gerado! Está na Área de Testes de ${MOD_LABEL[idea.module ?? 'organico'] ?? 'Orgânico'} (seção Conteúdo), esperando sua nota e aprovação.`)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao gerar post')
    }
    setBusyId(null)
  }

  const dismiss = async (id: string) => {
    await supabase.from('marketing_ai_ideas').update({ status: 'dismissed' }).eq('id', id)
    await load()
  }

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '16px' }}>
        💡 <strong>Creative Agent.</strong> Ele olha a sua marca, os insights reais e a biblioteca e sugere ideias de post — gancho, ângulo e formato. Gostou de uma? <strong>Gera o post</strong> com um clique, que cai na Área de Testes pra você aprovar. Nada é publicado sozinho.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button onClick={generateIdeas} disabled={generating} style={{ padding: '9px 18px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12.5px', borderRadius: '9px', border: 'none', cursor: generating ? 'wait' : 'pointer', fontFamily: D }}>
          {generating ? '💭 Pensando em ideias...' : ideas.length ? '↻ Gerar mais ideias' : '✨ Gerar ideias'}
        </button>
        {msg && <span style={{ fontSize: '11.5px', color: '#4ade80' }}>{msg}</span>}
        {err && <span style={{ fontSize: '11.5px', color: '#f87171' }}>{err}</span>}
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando...</div>
      ) : ideas.length === 0 ? (
        <div style={{ padding: '28px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>
          Nenhuma ideia ainda. Clique em <strong>Gerar ideias</strong> e o agente sugere conceitos de post com base na sua marca e nos insights.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {ideas.map(i => (
            <div key={i.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: i.status === 'used' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                {i.module && <span style={{ fontSize: '8.5px', fontWeight: 700, color: ORANGE, border: '1px solid rgba(255,109,41,0.4)', borderRadius: '99px', padding: '1px 7px' }}>{MOD_LABEL[i.module] ?? i.module}</span>}
                {i.format && <span style={{ fontSize: '8.5px', fontWeight: 700, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '99px', padding: '1px 7px' }}>{i.format}</span>}
                {i.status === 'used' && <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#4ade80', marginLeft: 'auto' }}>✓ gerado</span>}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', lineHeight: 1.35 }}>{i.title}</div>
              {i.hook && <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>“{i.hook}”</div>}
              {i.angle && <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>{i.angle}</div>}
              {i.rationale && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, fontStyle: 'italic' }}>{i.rationale}</div>}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                <button onClick={() => generatePost(i)} disabled={busyId === i.id || i.status === 'used'} style={{ flex: 1, padding: '7px', background: i.status === 'used' ? 'rgba(255,255,255,0.06)' : ORANGE, color: i.status === 'used' ? MUTED : '#000', fontWeight: 700, fontSize: '11px', borderRadius: '8px', border: 'none', cursor: busyId === i.id || i.status === 'used' ? 'default' : 'pointer', fontFamily: D }}>
                  {busyId === i.id ? 'Gerando...' : i.status === 'used' ? 'Já gerado' : '✨ Gerar post'}
                </button>
                <button onClick={() => dismiss(i.id)} title="Dispensar" style={{ padding: '7px 10px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '11px', cursor: 'pointer', fontFamily: D }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
