import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { track } from '../../../lib/analytics'
import { CARD, MUTED, BORDER, D, inputStyle, SUPABASE_URL } from './shared'
import type { Template, Brand } from './formatTemplates'

const ORANGE = '#FF6D29'
const MODS: { key: string; label: string }[] = [{ key: 'organico', label: 'Orgânico' }, { key: 'stories', label: 'Stories' }, { key: 'campanhas', label: 'Campanhas' }]

// Studio de um formato: preenche os campos (à mão ou com IA), vê o preview ao
// vivo e exporta a imagem REAL (html-to-image) — que cai na Área de Testes pra
// aprovação. Renderiza o template em tamanho cheio (escondido/escalado) e
// captura esse nó em resolução natural.
export default function FormatStudio({ companyId, template, brand, onClose, onSaved }: { companyId: string; template: Template; brand: Brand; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const nodeRef = useRef<HTMLDivElement>(null)
  const [fields, setFields] = useState<Record<string, string>>({ ...template.sample })
  const [subject, setSubject] = useState('')
  const [caption, setCaption] = useState('')
  const [mod, setMod] = useState('organico')
  const [filling, setFilling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }))

  const fillWithAi = async () => {
    setFilling(true); setErr(''); setMsg('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/format-fill`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: template.label, fields: template.fields.map(f => ({ key: f.key, label: f.label })), subject }),
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error ?? 'Erro ao preencher')
      setFields(f => ({ ...f, ...(r.values ?? {}) }))
      if (!caption && r.values?.text) setCaption(String(r.values.text))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao preencher')
    }
    setFilling(false)
  }

  const generate = async () => {
    if (!nodeRef.current) return
    setSaving(true); setErr(''); setMsg('')
    try {
      await document.fonts.ready
      const dataUrl = await toPng(nodeRef.current, { width: template.w, height: template.h, cacheBust: true, pixelRatio: 1 })
      const blob = await (await fetch(dataUrl)).blob()
      const path = `renders/${companyId}/${crypto.randomUUID()}.png`
      const { error: upErr } = await supabase.storage.from('post-images').upload(path, blob, { contentType: 'image/png', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('post-images').getPublicUrl(path)
      const { error: insErr } = await supabase.from('marketing_ai_test_content').insert({
        company_id: companyId, kind: mod, idea: subject || template.label, caption: caption || null,
        format: template.label, image_url: pub.publicUrl,
      })
      if (insErr) throw insErr
      track('content_generated', `Gerou imagem de formato (${template.label})`, { template: template.key })
      setMsg('Imagem gerada! Está na Área de Testes (seção Conteúdo), esperando sua aprovação.')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao gerar imagem')
    }
    setSaving(false)
  }

  // Preview escalado pra caber (largura-alvo ~360px).
  const scale = Math.min(360 / template.w, 460 / template.h)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0E0B0A', border: `1px solid ${BORDER}`, borderRadius: '16px', width: '100%', maxWidth: '860px', maxHeight: '92vh', overflow: 'auto', padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>{template.icon} {template.label}</div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: MUTED, fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '22px', alignItems: 'start' }}>
          {/* Campos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Sobre o que é o post? (opcional)" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={fillWithAi} disabled={filling} style={{ padding: '8px 14px', background: filling ? 'rgba(255,109,41,0.4)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: filling ? 'wait' : 'pointer', fontFamily: D, whiteSpace: 'nowrap' }}>{filling ? '...' : '✨ Preencher com IA'}</button>
            </div>
            {template.fields.map(fd => (
              <div key={fd.key}>
                <label style={{ display: 'block', fontSize: '10px', color: MUTED, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{fd.label}</label>
                {fd.type === 'textarea'
                  ? <textarea value={fields[fd.key] ?? ''} onChange={e => set(fd.key, e.target.value)} rows={2} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D }} />
                  : <input value={fields[fd.key] ?? ''} onChange={e => set(fd.key, e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />}
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: '6px', paddingTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: MUTED, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legenda do post (vai junto)</label>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} placeholder="Legenda que acompanha a imagem no Instagram" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {MODS.map(m => (
                  <button key={m.key} onClick={() => setMod(m.key)} style={{ padding: '5px 12px', borderRadius: '7px', border: `1px solid ${mod === m.key ? 'rgba(255,109,41,0.4)' : BORDER}`, background: mod === m.key ? 'rgba(255,109,41,0.1)' : 'transparent', color: mod === m.key ? ORANGE : MUTED, fontSize: '11px', cursor: 'pointer', fontFamily: D }}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: template.w * scale, height: template.h * scale, overflow: 'hidden', borderRadius: '10px', border: `1px solid ${BORDER}` }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <div ref={nodeRef} style={{ width: template.w, height: template.h }}>{template.render(fields, brand)}</div>
              </div>
            </div>
            <div style={{ fontSize: '9.5px', color: MUTED }}>{template.w}×{template.h}px</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '18px' }}>
          <button onClick={generate} disabled={saving} style={{ padding: '10px 22px', background: saving ? 'rgba(255,109,41,0.4)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: D }}>{saving ? 'Gerando...' : '🎨 Gerar imagem'}</button>
          {msg && <span style={{ fontSize: '11.5px', color: '#4ade80' }}>{msg}</span>}
          {err && <span style={{ fontSize: '11.5px', color: '#f87171' }}>{err}</span>}
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '9px 12px', marginTop: '12px', fontSize: '10.5px', color: MUTED, lineHeight: 1.5 }}>
          A imagem é montada campo a campo (não é foto de IA). Depois de gerar, ela entra na Área de Testes pra você aprovar antes de publicar.
        </div>
      </div>
    </div>
  )
}
