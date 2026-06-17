import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'
import JarvisOrb from '../../components/JarvisOrb'

const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'
type Lang = 'pt' | 'en'

const VOICE_IDS: Record<Lang, string> = {
  pt: 'CstacWqMhJQlnfLPxRG4',
  en: 'cCYjmrGZaI86GUJ7F2Nn',
}
const STT_LANG: Record<Lang, string> = {
  pt: 'pt-BR',
  en: 'en-US',
}
const STATUS_LABELS: Record<Lang, Record<VoiceState, string>> = {
  pt: {
    idle:      'Esperando...',
    listening: '● Ouvindo',
    thinking:  '◌ Pensando',
    speaking:  '▶ Respondendo',
  },
  en: {
    idle:      'Waiting...',
    listening: '● Listening',
    thinking:  '◌ Thinking',
    speaking:  '▶ Responding',
  },
}

// Web Speech API types (not in standard TS lib)
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
  const w = window as Record<string, unknown>
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

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const audioRef       = useRef<HTMLAudioElement | null>(null)
  const autoListenRef  = useRef(autoListen)
  const voiceStateRef  = useRef(voiceState)

  useEffect(() => { autoListenRef.current  = autoListen  }, [autoListen])
  useEffect(() => { voiceStateRef.current  = voiceState  }, [voiceState])

  // Cleanup on unmount
  useEffect(() => () => {
    recognitionRef.current?.abort()
    if (audioRef.current) {
      audioRef.current.pause()
      if (audioRef.current.src.startsWith('blob:')) URL.revokeObjectURL(audioRef.current.src)
    }
  }, [])

  // Auto-listen: restart listening a moment after going idle
  useEffect(() => {
    if (voiceState !== 'idle' || !autoListen) return
    const t = setTimeout(() => {
      if (autoListenRef.current && voiceStateRef.current === 'idle') startListening()
    }, 700)
    return () => clearTimeout(t)
  }, [voiceState, autoListen])

  function startListening() {
    const SR = getSR()
    if (!SR) return
    if (voiceStateRef.current !== 'idle') return

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
      if (finalTranscript.trim()) {
        callAgent(finalTranscript.trim())
      } else {
        setVoiceState('idle')
      }
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        setVoiceState('idle') // will re-trigger auto-listen via useEffect
        return
      }
      console.error('Speech error:', e.error)
      setInterimText('')
      recognitionRef.current = null
      setVoiceState('idle')
    }

    recognitionRef.current = recognition
    setVoiceState('listening')
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setVoiceState('idle')
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

  async function callAgent(message: string) {
    if (!session) return
    setVoiceState('thinking')
    setUserText(message)
    setAgentText('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: [] }),
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
        if (d.audio === null) setHasTTS(false)
        setVoiceState('idle')
        return
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

  const STATUS = STATUS_LABELS[lang][voiceState]
  const micActive   = voiceState === 'listening'
  const micDisabled = voiceState === 'thinking' || voiceState === 'speaking'

  return (
    <div style={{
      minHeight: '100vh', background: BG, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
      position: 'relative',
    }}>

      {/* Scanline overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 4px)' }} />

      {/* HUD corner accents */}
      {[['top:56px','left:20px','borderLeft','borderTop'],['top:56px','right:20px','borderRight','borderTop'],
        ['bottom:20px','left:20px','borderLeft','borderBottom'],['bottom:20px','right:20px','borderRight','borderBottom']
      ].map((sides, i) => (
        <div key={i} style={{
          position: 'fixed', width: 40, height: 40, pointerEvents: 'none', zIndex: 0,
          ...Object.fromEntries(sides.slice(0,2).map(s => s.split(':'))),
          ...Object.fromEntries(sides.slice(2).map(s => [s, '1px solid rgba(255,109,41,0.12)'])),
        }} />
      ))}

      {/* ── Top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,109,41,0.07)',
        background: 'rgba(14,11,10,0.88)', backdropFilter: 'blur(16px)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#000' }}>SB</div>
          <span style={{ color: ORANGE, fontWeight: 700, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Jarvis</span>
          {!hasTTS && <span style={{ fontSize: 10, color: 'rgba(255,109,41,0.3)', marginLeft: 4 }}>texto · configure ELEVENLABS_API_KEY para voz</span>}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Always-listen toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: autoListen ? 'rgba(255,109,41,0.7)' : 'rgba(255,255,255,0.22)', letterSpacing: '0.06em' }}>
              {lang === 'pt' ? 'Sempre ouvindo' : 'Always on'}
            </span>
            <div
              onClick={toggleAutoListen}
              style={{
                width: 38, height: 20, borderRadius: 99, cursor: 'pointer',
                background: autoListen ? ORANGE : 'rgba(255,255,255,0.1)',
                border: `1px solid ${autoListen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                position: 'relative', transition: 'all 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: autoListen ? 18 : 2, width: 14, height: 14,
                borderRadius: '50%', background: autoListen ? '#000' : 'rgba(255,255,255,0.4)',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>

          {/* PT / EN toggle */}
          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid rgba(255,109,41,0.18)', overflow: 'hidden' }}>
            {(['pt', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '5px 11px', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                background: lang === l ? ORANGE : 'transparent',
                color: lang === l ? '#000' : 'rgba(255,109,41,0.4)',
                transition: 'all 0.15s',
              }}>{l.toUpperCase()}</button>
            ))}
          </div>

          <Link to="/dashboard" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.75)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)' }}>
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, zIndex: 1, paddingTop: 48 }}>

        {/* 3D Orb */}
        <JarvisOrb state={voiceState} size={360} />

        {/* Status */}
        <div style={{
          fontSize: 12, fontWeight: 600, color: ORANGE, letterSpacing: '0.16em',
          textTransform: 'uppercase', opacity: voiceState === 'idle' ? 0.35 : 0.9,
          transition: 'opacity 0.4s', minHeight: 18,
        }}>
          {STATUS}
        </div>

        {/* Transcript */}
        <div style={{ width: 520, maxWidth: 'calc(100vw - 48px)', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 64 }}>
          {(userText || interimText) && (
            <div style={{
              padding: '11px 16px', borderRadius: 12,
              background: 'rgba(255,109,41,0.05)', border: '1px solid rgba(255,109,41,0.1)',
              fontSize: 14, lineHeight: 1.6,
              color: interimText ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.65)',
              fontStyle: interimText ? 'italic' : 'normal',
            }}>
              {interimText || userText}
            </div>
          )}
          {agentText && (
            <div style={{
              padding: '13px 16px', borderRadius: 12,
              background: 'rgba(21,14,8,0.92)', border: '1px solid rgba(255,109,41,0.07)',
              fontSize: 14, lineHeight: 1.7, color: 'white',
            }}>
              {agentText}
            </div>
          )}
        </div>

        {/* Mic button — only shown when autoListen is OFF */}
        {!autoListen && (
          <button
            onClick={handleMicClick}
            disabled={micDisabled}
            style={{
              width: 72, height: 72, borderRadius: '50%', border: 'none',
              cursor: micDisabled ? 'not-allowed' : 'pointer',
              background: micActive ? ORANGE : 'rgba(255,109,41,0.1)',
              boxShadow: micActive ? '0 0 30px rgba(255,109,41,0.5)' : 'none',
              outline: `2px solid ${micActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,109,41,0.25)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: micActive ? '#000' : micDisabled ? 'rgba(255,109,41,0.25)' : ORANGE }}>
              <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </button>
        )}

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.04em', minHeight: 16 }}>
          {autoListen
            ? (lang === 'pt' ? 'Jarvis está sempre ouvindo — use o toggle para pausar' : 'Jarvis is always listening — use the toggle to pause')
            : (micActive ? (lang === 'pt' ? 'Clique para parar' : 'Click to stop') : (lang === 'pt' ? 'Clique para falar' : 'Click to speak'))
          }
        </div>
      </div>
    </div>
  )
}
