import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'
import { d } from '../../i18n-dash'
import { PostCard, type Post, type PostStatus } from './PostsPage'
import { OppCard, type Opportunity } from './OpportunitiesPage'

const ORANGE = '#FF6D29'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

export default function ApprovalsPage() {
  const { user, session } = useAuth()
  const { lang } = useLang()
  const T = d[lang].approvals
  const TP = d[lang].posts
  const TO = d[lang].opportunities

  const [posts, setPosts] = useState<Post[]>([])
  const [reviewOpps, setReviewOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const { data: company } = await supabase.from('companies').select('id, plan').eq('user_id', user!.id).maybeSingle()
    if (!company) { setLoading(false); return }

    const [{ data: draftPosts }, { data: opps }] = await Promise.all([
      supabase.from('posts').select('id, content, image_suggestion, image_url, best_time, status, platform, created_at, agent_notes')
        .eq('company_id', company.id).eq('status', 'rascunho').order('created_at', { ascending: false }),
      supabase.from('opportunities').select('id, type, title, description, estimated_impact, status, ref_id, ref_type, ai_draft, created_at')
        .eq('company_id', company.id).eq('status', 'open').eq('ref_type', 'review').not('ai_draft', 'is', null)
        .order('created_at', { ascending: false }),
    ])

    setPosts((draftPosts ?? []) as Post[])
    setReviewOpps((opps ?? []) as Opportunity[])
    setLoading(false)
  }

  const handlePostStatusChange = async (id: string, status: PostStatus) => {
    await supabase.from('posts').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id || status === 'rascunho'))
  }

  const handleOppResolve = (id: string) => setReviewOpps(prev => prev.filter(o => o.id !== id))
  const handleOppDismiss = (id: string) => setReviewOpps(prev => prev.filter(o => o.id !== id))

  const isEmpty = !loading && posts.length === 0 && reviewOpps.length === 0

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>{T.title}</h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>{T.subtitle}</p>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: '780px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: MUTED }}>{d[lang].common.loading}</div>
        ) : isEmpty ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontFamily: D, fontSize: '1.3rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{T.emptyAll}</div>
            <div style={{ color: MUTED, fontSize: '13px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.7 }}>{T.emptyAllDesc}</div>
          </div>
        ) : (
          <>
            {reviewOpps.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                  {T.reviewsSection} ({reviewOpps.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reviewOpps.map(opp => (
                    <OppCard key={opp.id} opp={opp} session={session} onResolve={handleOppResolve} onDismiss={handleOppDismiss} T={TO} />
                  ))}
                </div>
              </div>
            )}

            {posts.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                  {T.postsSection} ({posts.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} onStatusChange={handlePostStatusChange} locked={false} T={TP} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
