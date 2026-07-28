import { useEffect, useMemo, useState } from 'react'
import type { CompanyData } from '../../../contexts/CompanyContext'
import { CARD, MUTED, BORDER, D } from './shared'
import {
  buildContextDemo, CONTEXT_CATEGORY_META, IMPORTANCE_META,
  type ContextNote, type ContextCategory, type Importance,
} from './growthIntelDemo'

const ORANGE = '#FF6D29'

// DEMO: persiste as notas do dono em localStorage por empresa. Quando o
// backend real existir, isto vira uma tabela (business_context) que alimenta
// a memória de longo prazo do agente. A estrutura já é a mesma.
function useContextNotes(companyId: string | undefined): [ContextNote[], (n: ContextNote[]) => void] {
  const key = `sb_business_context_${companyId ?? 'anon'}`
  const [notes, setNotes] = useState<ContextNote[]>(() => {
    if (typeof localStorage === 'undefined') return buildContextDemo()
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) as ContextNote[] : buildContextDemo()
    } catch { return buildContextDemo() }
  })
  const save = (n: ContextNote[]) => {
    setNotes(n)
    try { localStorage.setItem(key, JSON.stringify(n)) } catch { /* ignore */ }
  }
  return [notes, save]
}

const CATS = Object.keys(CONTEXT_CATEGORY_META) as ContextCategory[]
const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '9px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: D }

function fmt(d?: string | null) { return d ? new Date(d).toLocaleDateString('pt-BR') : null }

export default function BusinessContextTab({ company }: { company: Pick<CompanyData, 'id'> }) {
  const [notes, save] = useContextNotes(company.id)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)

  // form
  const [text, setText] = useState('')
  const [cat, setCat] = useState<ContextCategory>('estrategia')
  const [tags, setTags] = useState('')
  const [importance, setImportance] = useState<Importance>('medium')
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 10))
  const [expiration, setExpiration] = useState('')

  useEffect(() => { /* notes are per-company via key */ }, [company.id])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter(n => n.archived === showArchived)
      .filter(n => !q || n.text.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)) || CONTEXT_CATEGORY_META[n.category].label.toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt).localeCompare(a.updatedAt))
  }, [notes, query, showArchived])

  const activeCount = notes.filter(n => !n.archived).length

  const addNote = () => {
    if (!text.trim()) return
    const now = new Date().toISOString()
    const note: ContextNote = {
      id: `c_${Date.now()}`,
      text: text.trim(),
      category: cat,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      importance,
      effectiveDate: effective,
      expirationDate: expiration || null,
      aiSummary: `A IA vai considerar isto nas decisões: "${text.trim().slice(0, 90)}${text.trim().length > 90 ? '…' : ''}"`,
      createdAt: now, updatedAt: now, edits: 0, archived: false,
    }
    save([note, ...notes])
    setText(''); setTags(''); setExpiration(''); setImportance('medium'); setCat('estrategia'); setAdding(false)
  }

  const archive = (id: string, v: boolean) => save(notes.map(n => n.id === id ? { ...n, archived: v, updatedAt: new Date().toISOString() } : n))
  const remove = (id: string) => save(notes.filter(n => n.id !== id))

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '18px' }}>
        🧠 Aqui você ensina à IA o que <strong>nenhuma integração consegue saber</strong> — decisões, planos, mudanças na equipe, foco da temporada. Vira a <strong>memória estratégica</strong> do negócio e passa a influenciar toda campanha, conteúdo e recomendação. <em>(Modo demonstração — salvo só neste navegador por enquanto.)</em>
      </div>

      {/* Resumo da IA */}
      <div style={{ background: CARD, border: '1px solid rgba(255,109,41,0.2)', borderRadius: '14px', padding: '16px 18px', marginBottom: '18px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>✨ O que a IA aprendeu com você</div>
        <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
          {activeCount === 0
            ? 'Nada registrado ainda. Adicione a primeira nota abaixo pra IA começar a entender a estratégia do negócio.'
            : `Hoje o foco é ${notes.find(n => !n.archived && n.category === 'estrategia')?.tags[0] ?? 'crescer com consistência'}. Considerando ${activeCount} nota(s) ativa(s): restrições de operação, mudanças de equipe/preço e prioridades da temporada entram em toda decisão de conteúdo, campanha e automação.`}
        </div>
      </div>

      {/* Busca + ações */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por texto, tag ou categoria…" style={{ ...inputStyle, flex: 1, minWidth: '200px' }} />
        <button onClick={() => setShowArchived(v => !v)} style={{ padding: '9px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '9px', color: showArchived ? ORANGE : MUTED, fontSize: '12.5px', cursor: 'pointer', fontFamily: D }}>
          {showArchived ? '← Ativas' : '🗄️ Arquivadas'}
        </button>
        {!showArchived && (
          <button onClick={() => setAdding(a => !a)} style={{ padding: '9px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12.5px', border: 'none', borderRadius: '9px', cursor: 'pointer', fontFamily: D }}>
            {adding ? 'Cancelar' : '+ Nova nota'}
          </button>
        )}
      </div>

      {/* Formulário */}
      {adding && !showArchived && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '18px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder='Ex: "Vamos focar em casamentos nesta temporada." / "Fechamos toda segunda." / "Aumentaremos preços mês que vem."' style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '4px' }}>Categoria</div>
              <select value={cat} onChange={e => setCat(e.target.value as ContextCategory)} style={{ ...inputStyle, appearance: 'none' }}>
                {CATS.map(c => <option key={c} value={c} style={{ background: '#150E08' }}>{CONTEXT_CATEGORY_META[c].icon} {CONTEXT_CATEGORY_META[c].label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '4px' }}>Tags (separe por vírgula)</div>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="casamentos, temporada" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '4px' }}>Vale a partir de</div>
              <input type="date" value={effective} onChange={e => setEffective(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '4px' }}>Expira em (opcional)</div>
              <input type="date" value={expiration} onChange={e => setExpiration(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '6px' }}>Importância</div>
            <div style={{ display: 'flex', gap: '7px' }}>
              {(['high', 'medium', 'low'] as Importance[]).map(imp => (
                <button key={imp} onClick={() => setImportance(imp)}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${importance === imp ? IMPORTANCE_META[imp].color : BORDER}`, background: importance === imp ? `${IMPORTANCE_META[imp].color}18` : 'transparent', color: importance === imp ? IMPORTANCE_META[imp].color : MUTED, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: D }}>
                  {IMPORTANCE_META[imp].label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={addNote} disabled={!text.trim()} style={{ alignSelf: 'flex-start', padding: '9px 20px', background: text.trim() ? ORANGE : 'rgba(255,255,255,0.08)', color: text.trim() ? '#000' : MUTED, fontWeight: 700, fontSize: '13px', border: 'none', borderRadius: '9px', cursor: text.trim() ? 'pointer' : 'not-allowed', fontFamily: D }}>
            Salvar na memória do negócio
          </button>
        </div>
      )}

      {/* Notas */}
      {visible.length === 0 ? (
        <div style={{ color: MUTED, fontSize: '13px', padding: '30px 0', textAlign: 'center' }}>
          {showArchived ? 'Nenhuma nota arquivada.' : 'Nenhuma nota ainda. Registre a primeira acima.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visible.map(n => {
            const c = CONTEXT_CATEGORY_META[n.category]
            const imp = IMPORTANCE_META[n.importance]
            return (
              <div key={n.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '13px', padding: '15px 17px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: MUTED, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: '99px', padding: '2px 9px' }}>{c.icon} {c.label}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: imp.color, border: `1px solid ${imp.color}44`, borderRadius: '99px', padding: '2px 9px' }}>Importância {imp.label}</span>
                  {n.tags.map(t => <span key={t} style={{ fontSize: '10px', color: '#60a5fa' }}>#{t}</span>)}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button onClick={() => archive(n.id, !n.archived)} style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '11px', cursor: 'pointer' }}>{n.archived ? 'Restaurar' : 'Arquivar'}</button>
                    <button onClick={() => remove(n.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,0.6)', fontSize: '11px', cursor: 'pointer' }}>Excluir</button>
                  </div>
                </div>
                <div style={{ fontSize: '13.5px', color: 'white', lineHeight: 1.55, marginBottom: '9px' }}>{n.text}</div>
                <div style={{ padding: '9px 12px', background: 'rgba(255,109,41,0.05)', borderRadius: '9px', fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: '9px' }}>
                  <span style={{ color: ORANGE, fontWeight: 700 }}>✨ Resumo IA:</span> {n.aiSummary}
                </div>
                <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>Vale a partir de {fmt(n.effectiveDate)}</span>
                  {n.expirationDate && <span>· expira em {fmt(n.expirationDate)}</span>}
                  <span>· atualizado em {fmt(n.updatedAt)}</span>
                  {n.edits > 0 && <span>· editado {n.edits}×</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
