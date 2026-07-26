import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import JarvisOrb from '../../components/JarvisOrb'

const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'
type Lang = 'pt' | 'en'
type AgentRole = 'marketing'

const VOICE_IDS: Record<Lang, string> = {
  pt: 'pNInz6obpgDQGcFmaJgB', // Adam — multilingual v2, works on all ElevenLabs accounts
  en: 'pNInz6obpgDQGcFmaJgB',
}
const STT_LANG: Record<Lang, string> = { pt: 'pt-BR', en: 'en-US' }

const STATUS_LABELS: Record<Lang, Record<VoiceState, string>> = {
  pt: { idle: 'Pronto', listening: '● Ouvindo', thinking: '◌ Processando', speaking: '▶ Respondendo' },
  en: { idle: 'Ready', listening: '● Listening', thinking: '◌ Processing', speaking: '▶ Responding' },
}

// O Agente de Vendas foi excluído (decisão do dono) — o que sobrou virou o
// "Agente Geral", único papel hoje, cobrindo o negócio inteiro.
const AGENTS: { role: AgentRole; emoji: string; label: { pt: string; en: string } }[] = [
  { role: 'marketing',  emoji: '📣', label: { pt: 'Geral',  en: 'General'  } },
]

const AGENT_NAMES: Record<AgentRole, string> = {
  marketing: 'Agente Geral',
}

// Atmospheric glow behind orb per state
const BG_GLOW: Record<VoiceState, number> = {
  idle: 0.06, listening: 0.22, thinking: 0.14, speaking: 0.36,
}

// Web Speech API types
interface ISpeechRecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface ISpeechRecognitionResultList { length: number; [i: number]: ISpeechRecognitionResult }
interface ISpeechRecognitionEvent { resultIndex: number; results: ISpeechRecognitionResultList }
interface ISpeechRecognition {
  lang: string; continuous: boolean; interimResults: boolean
  start(): void; stop(): void; abort(): void
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
function getSR(): (new () => ISpeechRecognition) | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w['webkitSpeechRecognition'] ?? w['SpeechRecognition']) as (new () => ISpeechRecognition) | undefined
}

export default function JarvisPage() {
  const { session } = useAuth()
  const [voiceState, setVoiceState]   = useState<VoiceState>('idle')
  const [lang, setLang]               = useState<Lang>('pt')
  const [autoListen, setAutoListen]   = useState(true)
  const [hasTTS, setHasTTS]           = useState(true)
  const [userText, setUserText]       = useState('')
  const [agentText, setAgentText]     = useState('')
  const [interimText, setInterimText] = useState('')
  const [agentRole, setAgentRole]     = useState<AgentRole>('marketing')

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const audioRef       = useRef<HTMLAudioElement | null>(null)
  const autoListenRef  = useRef(autoListen)
  const voiceStateRef  = useRef(voiceState)
  const agentRoleRef   = useRef(agentRole)

  useEffect(() => { autoListenRef.current = autoListen  }, [autoListen])
  useEffect(() => { voiceStateRef.current = voiceState  }, [voiceState])
  useEffect(() => { agentRoleRef.current  = agentRole   }, [agentRole])

  useEffect(() => () => {
    recognitionRef.current?.abort()
    if (audioRef.current) {
      audioRef.current.pause()
      if (audioRef.current.src.startsWith('blob:')) URL.revokeObjectURL(audioRef.current.src)
    }
  }, [])

  useEffect(() => {
    if (voiceState !== 'idle' || !autoListen) return
    const t = setTimeout(() => {
      if (autoListenRef.current && voiceStateRef.current === 'idle') startListening()
    }, 700)
    return () => clearTimeout(t)
  }, [voiceState, autoListen])

  function startListening() {
    const SR = getSR()
    if (!SR || voiceStateRef.current !== 'idle') return
    const recognition = new SR()
    recognition.lang = STT_LANG[lang]
    recognition.continuous = false
    recognition.interimResults = true
    let finalTranscript = ''
    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalTranscript += t
        else interim += t
      }
      setInterimText(interim)
    }
    recognition.onend = () => {
      setInterimText('')
      recognitionRef.current = null
      if (finalTranscript.trim()) callAgent(finalTranscript.trim())
      else setVoiceState('idle')
    }
    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') { setVoiceState('idle'); return }
      setInterimText(''); recognitionRef.current = null; setVoiceState('idle')
    }
    recognitionRef.current = recognition
    setVoiceState('listening')
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop(); recognitionRef.current = null; setVoiceState('idle')
  }

  function handleMicClick() {
    if (voiceState === 'listening') { stopListening(); return }
    if (voiceState !== 'idle') return
    startListening()
  }

  function toggleAutoListen() {
    const next = !autoListen
    setAutoListen(next)
    if (!next && voiceState === 'listening') stopListening()
  }

  function switchAgent(role: AgentRole) {
    if (voiceState !== 'idle') return
    setAgentRole(role)
    setUserText('')
    setAgentText('')
    setInterimText('')
  }

  async function callAgent(message: string) {
    if (!session) return
    setVoiceState('thinking')
    setUserText(message)
    setAgentText('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hermes-proxy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: [], agent_role: agentRoleRef.current }),
      })
      const data = await res.json()
      const reply = res.ok ? (data.reply ?? 'Entendido.') : (data.error ?? 'Erro.')
      setAgentText(reply)
      if (hasTTS) await speakText(reply)
      else setVoiceState('idle')
    } catch {
      setAgentText('Erro de conexão.')
      setVoiceState('idle')
    }
  }

  async function speakText(text: string) {
    if (!session) { setVoiceState('idle'); return }
    setVoiceState('speaking')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-tts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: VOICE_IDS[lang] }),
      })
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        const d = await res.json()
        if (d.audio === null || d.error) setHasTTS(false)
        setVoiceState('idle'); return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setVoiceState('idle') }
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; setVoiceState('idle') }
      await audio.play()
    } catch { setVoiceState('idle') }
  }

  const currentAgent = AGENTS.find(a => a.role === agentRole)!
  const STATUS = STATUS_LABELS[lang][voiceState]
  const micActive   = voiceState === 'listening'
  const micDisabled = voiceState === 'thinking' || voiceState === 'speaking'
  const busy = voiceState !== 'idle'

  return (
    <div style={{
      minHeight: '100vh', background: BG, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", position: 'relative',
    }}>
      {/* Subtle scanline texture */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.004) 2px,rgba(255,255,255,0.004) 4px)' }} />

      {/* HUD corner accents */}
      {[
        { top: '56px', left: '20px', borderLeft: '1px solid rgba(255,109,41,0.1)', borderTop: '1px solid rgba(255,109,41,0.1)' },
        { top: '56px', right: '20px', borderRight: '1px solid rgba(255,109,41,0.1)', borderTop: '1px solid rgba(255,109,41,0.1)' },
        { bottom: '20px', left: '20px', borderLeft: '1px solid rgba(255,109,41,0.1)', borderBottom: '1px solid rgba(255,109,41,0.1)' },
        { bottom: '20px', right: '20px', borderRight: '1px solid rgba(255,109,41,0.1)', borderBottom: '1px solid rgba(255,109,41,0.1)' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'fixed', width: 36, height: 36, pointerEvents: 'none', zIndex: 0, ...s }} />
      ))}

      {/* ── Top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,109,41,0.06)',
        background: 'rgba(14,11,10,0.92)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#000' }}>SB</div>
          <span style={{ color: ORANGE, fontWeight: 700, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Jarvis</span>
          {!hasTTS && <span style={{ fontSize: 10, color: 'rgba(255,109,41,0.3)', marginLeft: 4 }}>texto · ElevenLabs indisponível</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: autoListen ? 'rgba(255,109,41,0.65)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
              {lang === 'pt' ? 'Sempre ouvindo' : 'Always on'}
            </span>
            <div onClick={toggleAutoListen} style={{
              width: 38, height: 20, borderRadius: 99, cursor: 'pointer',
              background: autoListen ? ORANGE : 'rgba(255,255,255,0.1)',
              border: `1px solid ${autoListen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
              position: 'relative', transition: 'all 0.25s',
            }}>
              <div style={{ position: 'absolute', top: 2, left: autoListen ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: autoListen ? '#000' : 'rgba(255,255,255,0.35)', transition: 'left 0.25s' }} />
            </div>
          </div>
          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid rgba(255,109,41,0.15)', overflow: 'hidden' }}>
            {(['pt', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '5px 11px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: lang === l ? ORANGE : 'transparent', color: lang === l ? '#000' : 'rgba(255,109,41,0.35)', transition: 'all 0.15s' }}>{l.toUpperCase()}</button>
            ))}
          </div>
          <Link to="/dashboard" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.25)' }}>
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 1, paddingTop: 48, width: '100%', maxWidth: 600 }}>

        {/* Active agent label */}
        <motion.div
          key={agentRole}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ fontSize: 11, color: 'rgba(255,109,41,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          {currentAgent.emoji} {AGENT_NAMES[agentRole]}
        </motion.div>

        {/* Orb + atmospheric background glow */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={{ opacity: BG_GLOW[voiceState] }}
            transition={{ duration: 1.0, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: 520, height: 520, borderRadius: '50%', pointerEvents: 'none',
              background: 'radial-gradient(circle, rgba(255,109,41,0.22) 0%, transparent 68%)',
            }}
          />
          <JarvisOrb state={voiceState} size={380} />
        </div>

        {/* Status indicator */}
        <motion.div
          animate={{
            opacity: voiceState === 'idle' ? 0.28 : 0.92,
          }}
          transition={{ duration: 0.5 }}
          style={{ fontSize: 11, fontWeight: 600, color: ORANGE, letterSpacing: '0.18em', textTransform: 'uppercase', minHeight: 16 }}
        >
          {STATUS}
        </motion.div>

        {/* Transcript bubbles */}
        <div style={{ width: '100%', padding: '0 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 72 }}>
          <AnimatePresence mode="popLayout">
            {(userText || interimText) && (
              <motion.div
                key={interimText ? 'interim' : userText}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                style={{ padding: '11px 16px', borderRadius: 12, background: 'rgba(255,109,41,0.04)', border: '1px solid rgba(255,109,41,0.08)', fontSize: 14, lineHeight: 1.65, color: interimText ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.6)', fontStyle: interimText ? 'italic' : 'normal' }}
              >
                {interimText || userText}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {agentText && (
              <motion.div
                key={agentText}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(21,14,8,0.95)', border: '1px solid rgba(255,109,41,0.06)', fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.88)' }}
              >
                {agentText}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Manual mic button */}
        <AnimatePresence>
          {!autoListen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              onClick={handleMicClick}
              disabled={micDisabled}
              style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: micDisabled ? 'not-allowed' : 'pointer', background: micActive ? ORANGE : 'rgba(255,109,41,0.08)', boxShadow: micActive ? '0 0 28px rgba(255,109,41,0.45)' : 'none', outline: `2px solid ${micActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,109,41,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: micActive ? '#000' : micDisabled ? 'rgba(255,109,41,0.2)' : ORANGE }}>
                <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Agent selector — só aparece quando há mais de 1 agente disponível */}
        {AGENTS.length > 1 && (
        <div style={{ width: '100%', padding: '0 28px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
            {lang === 'pt' ? 'Agentes' : 'Agents'}
          </div>
          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap' }}>
            {AGENTS.map(a => {
              const active = agentRole === a.role
              return (
                <motion.button
                  key={a.role}
                  onClick={() => switchAgent(a.role)}
                  disabled={busy}
                  whileHover={busy ? {} : { scale: 1.04 }}
                  whileTap={busy ? {} : { scale: 0.97 }}
                  style={{
                    padding: '7px 13px', borderRadius: 99,
                    border: `1px solid ${active ? 'rgba(255,109,41,0.55)' : 'rgba(255,255,255,0.07)'}`,
                    background: active ? 'rgba(255,109,41,0.10)' : 'transparent',
                    color: active ? ORANGE : 'rgba(255,255,255,0.35)',
                    fontSize: 12, fontWeight: active ? 700 : 400,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    boxShadow: active ? '0 0 14px rgba(255,109,41,0.12)' : 'none',
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}>
                  <span style={{ fontSize: 13 }}>{a.emoji}</span>
                  {a.label[lang]}
                </motion.button>
              )
            })}
          </div>
        </div>
        )}

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.04em', minHeight: 16, paddingBottom: 28 }}>
          {autoListen
            ? (lang === 'pt' ? 'Sempre ouvindo · pause com o toggle' : 'Always listening · pause with toggle')
            : (micActive ? (lang === 'pt' ? 'Clique para parar' : 'Click to stop') : (lang === 'pt' ? 'Clique para falar' : 'Click to speak'))
          }
        </div>
      </div>
    </div>
  )
}
