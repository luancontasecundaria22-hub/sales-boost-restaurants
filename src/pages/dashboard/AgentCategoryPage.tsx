import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useLang } from '../../contexts/LanguageContext'
import { d } from '../../i18n-dash'
import {
  CARD_GROUPS, CARD_ICONS, GROUP_ICONS, COMING_SOON_KEYS, titleFor, groupTitle,
  ModuleCard, useAgentCardPreviews, type GroupKey,
} from './agentCardShared'

const ORANGE = '#FF6D29'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

export default function AgentCategoryPage() {
  const { group } = useParams<{ group: string }>()
  const navigate = useNavigate()
  const { lang } = useLang()
  const T = d[lang].posts
  const { previewFor } = useAgentCardPreviews(T)

  const entry = CARD_GROUPS.find(g => g.group === group)
  if (!entry) return <Navigate to="/dashboard/posts" replace />
  const { group: groupKey, keys } = entry as { group: GroupKey; keys: (typeof entry.keys)[number][] }

  return (
    <div>
      <div style={{ padding: '20px 32px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => navigate('/dashboard/posts')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: D, flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = ORANGE; e.currentTarget.style.borderColor = 'rgba(255,109,41,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER }}>
          {T.cards.back}
        </button>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{T.title} / </span>
        <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'white' }}>{groupTitle(T, groupKey)}</span>
      </div>

      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>{GROUP_ICONS[groupKey]}</span>
          <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>{groupTitle(T, groupKey)}</h1>
        </div>
        <p style={{ color: MUTED, fontSize: '13px', marginBottom: '28px' }}>{T.cards.groupDesc[groupKey]}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {keys.map(key => (
            <ModuleCard
              key={key}
              title={titleFor(T, key, groupKey)}
              desc={T.cards.desc[key]}
              preview={previewFor(key)}
              icon={CARD_ICONS[key]}
              soon={COMING_SOON_KEYS.has(key)}
              openLabel={T.cards.open}
              soonLabel={T.cards.soon}
              onClick={() => navigate(`/dashboard/posts/${key}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
